/**
 * 通过 Google Translate 非官方 gtx 端点翻译文本（无需 API Key）。
 * 用于 Settings/About 的 release notes 等场景；失败时由调用方回退原文。
 */

const APP_LANG_TO_GOOGLE : Record<string , string> = {
	'en-US' : 'en' ,
	'en' : 'en' ,
	'zh-CN' : 'zh-CN' ,
	'zh-TW' : 'zh-TW' ,
	'ja-JP' : 'ja' ,
	'ja' : 'ja' ,
	'ko-KR' : 'ko' ,
	'ko' : 'ko' ,
};

type TranslateViaGoogleOptions = {
	from? : string;
	force? : boolean;
	chunkSize? : number;
	fetchImpl? : typeof fetch;
};

export const toGoogleTranslateLanguage = ( language : string ): string => {
	const normalized = language.trim();
	if( !normalized ) return 'en';
	const mapped = APP_LANG_TO_GOOGLE[normalized];
	if( mapped ) return mapped;
	const primary = normalized.split( /[-_]/ )[0]?.toLowerCase();
	if( primary === 'zh' ) {
		return /tw|hk|hant/i.test( normalized ) ? 'zh-TW' : 'zh-CN';
	}
	return primary || 'en';
};

export const shouldSkipGoogleTranslate = ( targetLanguage : string ): boolean => {
	return toGoogleTranslateLanguage( targetLanguage ) === 'en';
};

const extractTranslatedText = ( data : unknown ): string => {
	if( !Array.isArray( data ) || !Array.isArray( data[0] ) ) {
		return '';
	}
	return data[0]
		.map( ( segment ) => {
			if( Array.isArray( segment ) && typeof segment[0] === 'string' ) {
				return segment[0];
			}
			return '';
		} )
		.join( '' );
};

const translateChunkViaGoogle = async(
	text : string ,
	from : string ,
	to : string ,
	fetchImpl : typeof fetch ,
): Promise<string> => {
	const url = new URL( 'https://translate.googleapis.com/translate_a/single' );
	url.searchParams.set( 'client' , 'gtx' );
	url.searchParams.set( 'sl' , from );
	url.searchParams.set( 'tl' , to );
	url.searchParams.set( 'dt' , 't' );
	url.searchParams.set( 'q' , text );

	const response = await fetchImpl( url.toString() , {
		method : 'GET' ,
		headers : {
			Accept : 'application/json' ,
			'User-Agent' : 'ChatAIO' ,
		} ,
	} );
	if( !response.ok ) {
		throw new Error( `Google Translate HTTP ${ response.status }` );
	}

	const data = await response.json() as unknown;
	const translated = extractTranslatedText( data );
	if( !translated ) {
		throw new Error( 'Google Translate returned empty result' );
	}
	return translated;
};

/** 保护代码块 / 行内代码 / URL，降低 Google 翻译破坏 Markdown 的概率。 */
export const protectMarkdownForTranslate = ( markdown : string ) => {
	const bags : string[] = [];
	const stash = ( matched : string ) => {
		const token = `{{PH${ bags.length }}}`;
		bags.push( matched );
		return token;
	};

	const protectedText = markdown
		.replace( /```[\s\S]*?```/g , stash )
		.replace( /`[^`\n]+`/g , stash )
		.replace( /!\[[^\]]*]\([^)\s]+(?:\s+"[^"]*")?\)/g , stash )
		.replace( /\[[^\]]*]\([^)\s]+(?:\s+"[^"]*")?\)/g , ( full ) => {
			const urlMatch = full.match( /\(([^)\s]+)(?:\s+"[^"]*")?\)$/ );
			if( !urlMatch ) return full;
			const url = urlMatch[1];
			const labelEnd = full.lastIndexOf( '](' );
			const label = full.slice( 1 , labelEnd );
			return `[${ label }](${ stash( url ) })`;
		} )
		.replace( /https?:\/\/[^\s)<]+/g , stash );

	const restore = ( translated : string ) => {
		return bags.reduce( ( text , original , index ) => {
			const token = `{{PH${ index }}}`;
			/* Google 偶发在占位符两侧插入空格 */
			return text
				.split( token )
				.join( original )
				.split( `{{ PH${ index } }}` )
				.join( original );
		} , translated );
	};

	return { protectedText , restore };
};

const splitTextForTranslate = ( text : string , chunkSize : number ): string[] => {
	if( text.length <= chunkSize ) {
		return [ text ];
	}

	const chunks : string[] = [];
	let buffer = '';
	const pushBuffer = () => {
		if( buffer ) {
			chunks.push( buffer );
			buffer = '';
		}
	};

	const lines = text.split( '\n' );
	for( let i = 0; i < lines.length; i++ ) {
		const line = i === lines.length - 1 ? lines[i] : `${ lines[i] }\n`;
		if( !buffer ) {
			if( line.length <= chunkSize ) {
				buffer = line;
			} else {
				for( let offset = 0; offset < line.length; offset += chunkSize ) {
					chunks.push( line.slice( offset , offset + chunkSize ) );
				}
			}
			continue;
		}
		if( buffer.length + line.length <= chunkSize ) {
			buffer += line;
		} else {
			pushBuffer();
			if( line.length <= chunkSize ) {
				buffer = line;
			} else {
				for( let offset = 0; offset < line.length; offset += chunkSize ) {
					chunks.push( line.slice( offset , offset + chunkSize ) );
				}
			}
		}
	}
	pushBuffer();
	return chunks.length ? chunks : [ text ];
};

export const translateTextViaGoogle = async(
	text : string ,
	targetLanguage : string ,
	options : TranslateViaGoogleOptions = {} ,
): Promise<string> => {
	const trimmed = text?.trim();
	if( !trimmed ) return text;

	const tl = toGoogleTranslateLanguage( targetLanguage );
	if( !tl || ( tl === 'en' && options.force !== true ) ) {
		return text;
	}

	const from = options.from || 'auto';
	const fetchImpl = options.fetchImpl || globalThis.fetch?.bind( globalThis );
	if( !fetchImpl ) {
		throw new Error( 'fetch is unavailable' );
	}

	const { protectedText , restore } = protectMarkdownForTranslate( trimmed );
	const chunks = splitTextForTranslate( protectedText , options.chunkSize ?? 1500 );
	const translatedChunks : string[] = [];

	for( const chunk of chunks ) {
		translatedChunks.push( await translateChunkViaGoogle( chunk , from , tl , fetchImpl ) );
	}

	return restore( translatedChunks.join( '' ) );
};

export const translateMarkdownViaGoogle = translateTextViaGoogle;
