const MENU_AI_NAME_TARGET_WIDTH = 108;
const MENU_AI_NAME_ELLIPSIS = '...';

const fitMenuAIName = (name:string) => {
	const normalizedName = normalizeMenuAIName( name );
	const ellipsisWidth = getMenuTextWidth( MENU_AI_NAME_ELLIPSIS );
	
	if( getMenuTextWidth( normalizedName ) <= MENU_AI_NAME_TARGET_WIDTH ) {
		return padMenuTextToWidth( normalizedName , MENU_AI_NAME_TARGET_WIDTH );
	}
	
	let fitted = '';
	let fittedWidth = 0;
	for( const segment of splitMenuTextSegments( normalizedName ) ) {
		const nextWidth = getMenuTextWidth( segment );
		if( fittedWidth + nextWidth + ellipsisWidth > MENU_AI_NAME_TARGET_WIDTH ) {
			break;
		}
		fitted += segment;
		fittedWidth += nextWidth;
	}
	
	return padMenuTextToWidth( `${ fitted }${ MENU_AI_NAME_ELLIPSIS }` , MENU_AI_NAME_TARGET_WIDTH );
};

const getMenuTextWidth = (text:string) => {
	return splitMenuTextSegments( text ).reduce( ( width , segment ) => {
		return width + getMenuSegmentWidth( segment );
	} , 0 );
};

const escapeElectronMenuBarLabel = (label:string) => {
	return label.replace( /&/g , '&&' );
};

const normalizeMenuAIName = (name:string) => {
	return name.replace( /\s+/g , ' ' ).trim() || 'AI';
};

const padMenuTextToWidth = (text:string , targetWidth:number) => {
	const remainingWidth = targetWidth - getMenuTextWidth( text );
	if( remainingWidth <= 0 ) {
		return text;
	}
	return text + createMenuPadding( remainingWidth );
};

const createMenuPadding = (targetWidth:number) => {
	const scale = MENU_WIDTH_SEARCH_SCALE;
	const targetUnits = Math.max( 0 , Math.round( targetWidth * scale ) );
	const maxUnits = targetUnits + Math.round( MENU_PADDING_MAX_OVERSHOOT * scale );
	const bestPaddingByWidth = Array.from<string | null>( { length : maxUnits + 1 } ).fill( null );
	bestPaddingByWidth[0] = '';
	
	for( let width = 0 ; width <= maxUnits ; width++ ) {
		const currentPadding = bestPaddingByWidth[width];
		if( currentPadding === null ) continue;
		
		for( const space of MENU_WIDTH_SPACES ) {
			const nextWidth = width + Math.round( space.width * scale );
			if( nextWidth > maxUnits ) continue;
			const nextPadding = currentPadding + space.char;
			const existingPadding = bestPaddingByWidth[nextWidth];
			if( existingPadding === null || nextPadding.length < existingPadding.length ) {
				bestPaddingByWidth[nextWidth] = nextPadding;
			}
		}
	}
	
	let bestPadding = '';
	let bestScore = Number.POSITIVE_INFINITY;
	for( let width = 0 ; width <= maxUnits ; width++ ) {
		const padding = bestPaddingByWidth[width];
		if( padding === null ) continue;
		const actualWidth = width / scale;
		const overshootPenalty = actualWidth > targetWidth ? 0.05 : 0;
		const score = Math.abs( targetWidth - actualWidth ) + overshootPenalty + padding.length * 0.0001;
		if( score < bestScore ) {
			bestScore = score;
			bestPadding = padding;
		}
	}
	
	return bestPadding;
};

const splitMenuTextSegments = (text:string) => {
	if( menuTextSegmenter ) {
		return Array.from( menuTextSegmenter.segment( text ) , item => item.segment );
	}
	return Array.from( text );
};

const getMenuSegmentWidth = (segment:string) => {
	if( MENU_MEASURED_TEXT_WIDTHS[segment] !== undefined ) {
		return MENU_MEASURED_TEXT_WIDTHS[segment];
	}
	
	return Array.from( segment ).reduce( ( width , char ) => {
		return width + getMenuCharWidth( char );
	} , 0 );
};

const getMenuCharWidth = (char:string) => {
	if( /[\u0300-\u036F\u200D\uFE0E\uFE0F]/.test( char ) ) {
		return 0;
	}
	if( MENU_MEASURED_TEXT_WIDTHS[char] !== undefined ) {
		return MENU_MEASURED_TEXT_WIDTHS[char];
	}
	if( isCJKChar( char ) ) {
		return 12.57;
	}
	if( isHangulChar( char ) ) {
		return 12;
	}
	if( isEmojiLikeChar( char ) ) {
		return 12;
	}
	return 7;
};

const isCJKChar = (char:string) => {
	return /[\u2E80-\u9FFF\uF900-\uFAFF\u3040-\u30FF]/.test( char );
};

const isHangulChar = (char:string) => {
	return /[\uAC00-\uD7AF]/.test( char );
};

const isEmojiLikeChar = (char:string) => {
	return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test( char );
};

const menuTextSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
	? new Intl.Segmenter( undefined , { granularity : 'grapheme' } )
	: null;

const MENU_WIDTH_SEARCH_SCALE = 100;
const MENU_PADDING_MAX_OVERSHOOT = 0.75;

// 基于 Windows Segoe UI 9pt 菜单字体的 GenericTypographic 测量值; 其他平台会有少量偏差,但比字符数模型稳定.
const MENU_MEASURED_TEXT_WIDTHS:Record<string , number> = {
	' ' : 3.29 ,
	'\u00A0' : 3.29 ,
	'\u2000' : 6 ,
	'\u2001' : 12 ,
	'\u2002' : 6 ,
	'\u2003' : 12 ,
	'\u2004' : 4 ,
	'\u2005' : 3 ,
	'\u2006' : 2 ,
	'\u2007' : 6.47 ,
	'\u2008' : 2.6 ,
	'\u2009' : 2.4 ,
	'\u200A' : 1.5 ,
	'\u202F' : 3.29 ,
	'\u205F' : 2.67 ,
	'\u3000' : 12.57 ,
	'!' : 3.32 ,
	'"' : 4.46 ,
	'#' : 7.09 ,
	'$' : 6.47 ,
	'%' : 9.82 ,
	'&' : 9.6 ,
	'\'' : 2.4 ,
	'(' : 3.62 ,
	')' : 3.62 ,
	'*' : 5.1 ,
	'+' : 8.51 ,
	',' : 2.6 ,
	'-' : 4.8 ,
	'.' : 2.6 ,
	'/' : 4.68 ,
	'0' : 6.47 ,
	'1' : 6.47 ,
	'2' : 6.47 ,
	'3' : 6.47 ,
	'4' : 6.47 ,
	'5' : 6.47 ,
	'6' : 6.47 ,
	'7' : 6.47 ,
	'8' : 6.47 ,
	'9' : 6.47 ,
	':' : 2.6 ,
	';' : 2.6 ,
	'<' : 8.51 ,
	'=' : 8.51 ,
	'>' : 8.51 ,
	'?' : 5.47 ,
	'@' : 11.46 ,
	'A' : 7.74 ,
	'B' : 6.88 ,
	'C' : 7.43 ,
	'D' : 8.41 ,
	'E' : 6.07 ,
	'F' : 5.86 ,
	'G' : 8.23 ,
	'H' : 8.52 ,
	'I' : 3.19 ,
	'J' : 4.28 ,
	'K' : 6.96 ,
	'L' : 5.65 ,
	'M' : 10.78 ,
	'N' : 8.98 ,
	'O' : 9.05 ,
	'P' : 6.72 ,
	'Q' : 9.05 ,
	'R' : 7.18 ,
	'S' : 6.37 ,
	'T' : 6.29 ,
	'U' : 8.24 ,
	'V' : 7.45 ,
	'W' : 11.21 ,
	'X' : 7.08 ,
	'Y' : 6.63 ,
	'Z' : 6.84 ,
	'[' : 3.62 ,
	'\\' : 4.68 ,
	']' : 3.62 ,
	'^' : 8.51 ,
	'_' : 4.98 ,
	'`' : 4.07 ,
	'a' : 6.11 ,
	'b' : 7.05 ,
	'c' : 5.54 ,
	'd' : 7.07 ,
	'e' : 6.28 ,
	'f' : 3.76 ,
	'g' : 7.07 ,
	'h' : 6.79 ,
	'i' : 2.91 ,
	'j' : 2.91 ,
	'k' : 5.96 ,
	'l' : 2.91 ,
	'm' : 10.34 ,
	'n' : 6.79 ,
	'o' : 7.03 ,
	'p' : 7.05 ,
	'q' : 7.07 ,
	'r' : 4.17 ,
	's' : 5.09 ,
	't' : 4.07 ,
	'u' : 6.79 ,
	'v' : 5.75 ,
	'w' : 8.67 ,
	'x' : 5.51 ,
	'y' : 5.81 ,
	'z' : 5.43 ,
	'{' : 6.47 ,
	'|' : 2.87 ,
	'}' : 6.47 ,
	'~' : 8.51 ,
	'…' : 8.79,
};

const MENU_WIDTH_SPACES = [
	{ char : '\u3000' , width : MENU_MEASURED_TEXT_WIDTHS['\u3000'] } ,
	{ char : '\u2003' , width : MENU_MEASURED_TEXT_WIDTHS['\u2003'] } ,
	{ char : '\u2007' , width : MENU_MEASURED_TEXT_WIDTHS['\u2007'] } ,
	{ char : '\u2002' , width : MENU_MEASURED_TEXT_WIDTHS['\u2002'] } ,
	{ char : '\u2004' , width : MENU_MEASURED_TEXT_WIDTHS['\u2004'] } ,
	{ char : '\u00A0' , width : MENU_MEASURED_TEXT_WIDTHS['\u00A0'] } ,
	{ char : '\u2005' , width : MENU_MEASURED_TEXT_WIDTHS['\u2005'] } ,
	{ char : '\u205F' , width : MENU_MEASURED_TEXT_WIDTHS['\u205F'] } ,
	{ char : '\u2008' , width : MENU_MEASURED_TEXT_WIDTHS['\u2008'] } ,
	{ char : '\u2009' , width : MENU_MEASURED_TEXT_WIDTHS['\u2009'] } ,
	{ char : '\u2006' , width : MENU_MEASURED_TEXT_WIDTHS['\u2006'] } ,
	{ char : '\u200A' , width : MENU_MEASURED_TEXT_WIDTHS['\u200A'] },
];

export {
	escapeElectronMenuBarLabel ,
	fitMenuAIName ,
	getMenuTextWidth ,
	MENU_AI_NAME_ELLIPSIS ,
	MENU_AI_NAME_TARGET_WIDTH,
};
