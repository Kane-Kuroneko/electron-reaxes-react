/**
 * 把 Prompt 贴进当前 AI 页：通用探测可见输入，不写各家 CSS。
 * 未登录时 composer 多在中部英雄区；登录墙的邮箱/密码/弹窗要避开。
 * 合成 Control+V 在 Chromium 里经常不会真粘贴；先 focus 再 insertText / execCommand。
 * 设计：docs/features/playwright-demo-script.md
 */

export type LocatedAiComposer = {
	x : number;
	y : number;
	localX : number;
	localY : number;
	tag : string;
	hint : string;
};

type EvalTarget = {
	evaluate : Page['evaluate'];
};

type DemoComposerApi = {
	probe : () => { x:number; y:number; tag:string; hint:string } | null;
	pick : () => HTMLElement | null;
	closest : ( start:HTMLElement ) => HTMLElement | null;
	isLogin : ( el:Element | null ) => boolean;
	inspect : () => Array<{
		tag : string;
		skip : string;
		box : string;
		attrs : string;
	}>;
};

const composerFrameByPage = new WeakMap<Page , EvalTarget>();

export const readDemoClipboardText = async( electronApp:ElectronApplication ) => {
	try {
		return await electronApp.evaluate( ( { clipboard } ) => {
			return clipboard.readText();
		} );
	} catch {
		return '';
	}
};

export const locateAiComposerPoint = async( page:Page ):Promise<LocatedAiComposer | null> => {
	await waitForComposerDom( page );
	await waitForComposerCandidates( page );
	let best : LocatedAiComposer | null = null;
	let bestFrame : EvalTarget = page;
	for( const frame of page.frames() ) {
		const frameUrl = frame.url();
		if(
			frameUrl === 'about:blank'
			|| frameUrl.includes( 'stripe.com' )
			|| frameUrl.includes( 'stripe.network' )
			|| frameUrl.includes( 'challenges.cloudflare.com' )
		) {
			continue;
		}
		await installTsxEvalShim( frame );
		try {
			const hit = await frame.evaluate( () => {
				const loginType = ( el:Element ) => {
					const type = ( el.getAttribute( 'type' ) || '' ).toLowerCase();
					return type === 'password' || type === 'email' || type === 'tel' || type === 'hidden';
				};
				const loginAttr = ( el:Element ) => {
					const text = [
						el.getAttribute( 'autocomplete' ) || '' ,
						el.getAttribute( 'name' ) || '' ,
						el.getAttribute( 'placeholder' ) || '' ,
						el.getAttribute( 'aria-label' ) || '' ,
					].join( ' ' ).toLowerCase();
					return /\bemail\b/.test( text )
						|| text.includes( 'password' )
						|| /\busername\b/.test( text )
						|| text.includes( 'sign in' )
						|| text.includes( 'log in' );
				};
				const nodes = Array.from( document.querySelectorAll(
					'textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
				) );
				let best : { x:number; y:number; tag:string; hint:string; score:number } | null = null;
				const skipped : string[] = [];
				for( const el of nodes ) {
					const node = el as HTMLElement;
					const rect = node.getBoundingClientRect();
					const style = window.getComputedStyle( node );
					const tag = el.tagName.toLowerCase();
					if( loginType( el ) || loginAttr( el ) ) {
						skipped.push( `${ tag }#${ el.id || '' }:login` );
						continue;
					}
					if( style.display === 'none' || style.visibility === 'hidden' ) {
						skipped.push( `${ tag }#${ el.id || '' }:css` );
						continue;
					}
					if( rect.width < 8 && rect.height < 8 ) {
						skipped.push( `${ tag }#${ el.id || '' }:tiny` );
						continue;
					}
					const hint = (
						el.getAttribute( 'placeholder' )
						|| el.getAttribute( 'data-placeholder' )
						|| el.getAttribute( 'aria-label' )
						|| el.id
						|| ''
					).slice( 0 , 80 );
					const score = rect.width * Math.max( rect.height , 24 ) + Math.max( 0 , 120000 - Math.abs( rect.top - window.innerHeight * 0.55 ) * 40 );
					if( !best || score > best.score ) {
						best = {
							x : rect.left + rect.width / 2 ,
							y : rect.top + Math.min( Math.max( rect.height / 2 , 8 ) , 22 ) ,
							tag ,
							hint ,
							score,
						};
					}
				}
				return {
					href : location.href ,
					count : nodes.length ,
					skipped ,
					hit : best
						? {
							x : best.x ,
							y : best.y ,
							tag : best.tag ,
							hint : best.hint,
						}
						: null,
				};
			} );
			console.log(
				`[demo] composer ${ hit.href } hit=${ hit.hit ? `${ hit.hit.tag } ${ hit.hit.hint }` : `none skipped=${ hit.skipped.join( ',' ) || '-' }` }`,
			);
			if( hit.hit ) {
				const point = await toPageComposerPoint( page , frame , hit.hit );
				best = point;
				bestFrame = frame;
				break;
			}
		} catch( error ) {
			console.log( `[demo] composer probe failed: ${ error instanceof Error ? error.message : String( error ) }` );
		}
	}
	if( best ) {
		composerFrameByPage.set( page , bestFrame );
	}
	return best;
};

const toPageComposerPoint = async(
	page:Page ,
	frame:Frame ,
	hit:{ x:number; y:number; tag:string; hint:string },
):Promise<LocatedAiComposer> => {
	const point : LocatedAiComposer = {
		x : hit.x ,
		y : hit.y ,
		localX : hit.x ,
		localY : hit.y ,
		tag : hit.tag ,
		hint : hit.hint,
	};
	if( frame === page.mainFrame() ) {
		return point;
	}
	try {
		const element = await frame.frameElement();
		const box = await element.boundingBox();
		if( box ) {
			point.x = hit.x + box.x;
			point.y = hit.y + box.y;
		}
	} catch {
		/* 跨域 iframe */
	}
	return point;
};

export const focusAiComposerAt = async( page:Page , x:number , y:number , localX = x , localY = y ) => {
	const target = composerFrameByPage.get( page ) || page;
	await injectComposerHelpers( target );
	try {
		return await target.evaluate( ( point:{ x:number; y:number } ) => {
			const api = ( window as Window & {
				__CHATAIO_DEMO_COMPOSER__? : DemoComposerApi;
			} ).__CHATAIO_DEMO_COMPOSER__;
			if( !api ) {
				return false;
			}
			const hit = document.elementFromPoint( point.x , point.y ) as HTMLElement | null;
			const fromPoint = hit ? api.closest( hit ) : null;
			const located = fromPoint && api.isLogin( fromPoint ) === false
				? fromPoint
				: api.pick();
			if( !located || api.isLogin( located ) ) {
				return false;
			}
			located.scrollIntoView( {
				block : 'center' ,
				inline : 'nearest',
			} );
			located.focus();
			return api.isLogin( document.activeElement as Element | null ) === false;
		} , {
			x : localX ,
			y : localY,
		} );
	} catch {
		return false;
	}
};

export const composerLooksLikeLogin = async( page:Page ) => {
	const target = composerFrameByPage.get( page ) || page;
	await injectComposerHelpers( target );
	try {
		return await target.evaluate( () => {
			const api = ( window as Window & {
				__CHATAIO_DEMO_COMPOSER__? : DemoComposerApi;
			} ).__CHATAIO_DEMO_COMPOSER__;
			return api ? api.isLogin( document.activeElement as Element | null ) : false;
		} );
	} catch {
		return false;
	}
};

export const insertAiComposerText = async( page:Page , text:string ) => {
	const payload = text || '';
	if( payload.length === 0 ) {
		return false;
	}
	const target = composerFrameByPage.get( page ) || page;
	await injectComposerHelpers( target );
	try {
		const focused = await target.evaluate( () => {
			const api = ( window as Window & {
				__CHATAIO_DEMO_COMPOSER__? : DemoComposerApi;
			} ).__CHATAIO_DEMO_COMPOSER__;
			const el = document.activeElement as HTMLElement | null;
			return !!(
				api
				&& el
				&& el !== document.body
				&& el !== document.documentElement
				&& api.isLogin( el ) === false
			);
		} );
		if( focused === false ) {
			const located = await locateAiComposerPoint( page );
			if( located ) {
				await focusAiComposerAt( page , located.x , located.y , located.localX , located.localY );
			}
		}
	} catch {
		/* 远程页不可 eval */
	}

	try {
		await page.keyboard.insertText( payload );
	} catch {
		/* CDP insertText 失败则改页内写入 */
	}
	if( await composerHoldsText( page , payload ) ) {
		return true;
	}

	try {
		await target.evaluate( ( value:string ) => {
			const api = ( window as Window & {
				__CHATAIO_DEMO_COMPOSER__? : DemoComposerApi;
			} ).__CHATAIO_DEMO_COMPOSER__;
			if( !api ) {
				return;
			}
			const el = ( api.pick() || document.activeElement ) as HTMLElement | null;
			if( !el || api.isLogin( el ) ) {
				return;
			}
			el.focus();
			if( el.isContentEditable ) {
				document.execCommand( 'selectAll' , false );
				const ok = document.execCommand( 'insertText' , false , value );
				if( ok === false ) {
					el.dispatchEvent( new InputEvent( 'beforeinput' , {
						bubbles : true ,
						cancelable : true ,
						data : value ,
						inputType : 'insertText',
					} ) );
					el.dispatchEvent( new InputEvent( 'input' , {
						bubbles : true ,
						data : value ,
						inputType : 'insertText',
					} ) );
				}
				return;
			}
			const input = el as HTMLInputElement | HTMLTextAreaElement;
			if( 'value' in input ) {
				const proto = input instanceof HTMLTextAreaElement
					? HTMLTextAreaElement.prototype
					: HTMLInputElement.prototype;
				const desc = Object.getOwnPropertyDescriptor( proto , 'value' );
				desc?.set?.call( input , value );
				input.dispatchEvent( new Event( 'input' , {
					bubbles : true,
				} ) );
				input.dispatchEvent( new Event( 'change' , {
					bubbles : true,
				} ) );
			}
		} , payload );
	} catch {
		/* 远程页 CSP / 已导航 */
	}
	if( await composerHoldsText( page , payload ) ) {
		return true;
	}

	try {
		await page.keyboard.type( payload , {
			delay : 8,
		} );
	} catch {
		return false;
	}
	return composerHoldsText( page , payload );
};

const composerHoldsText = async( page:Page , text:string ) => {
	const needle = text.trim().slice( 0 , 48 );
	if( needle.length === 0 ) {
		return false;
	}
	const target = composerFrameByPage.get( page ) || page;
	await injectComposerHelpers( target );
	try {
		return await target.evaluate( ( snippet:string ) => {
			const api = ( window as Window & {
				__CHATAIO_DEMO_COMPOSER__? : DemoComposerApi;
			} ).__CHATAIO_DEMO_COMPOSER__;
			if( !api ) {
				return false;
			}
			const el = ( document.activeElement as HTMLElement | null ) || api.pick();
			if( !el || api.isLogin( el ) ) {
				return false;
			}
			const value = 'value' in el
				? String( ( el as HTMLInputElement | HTMLTextAreaElement ).value || '' )
				: ( el.innerText || el.textContent || '' );
			return value.includes( snippet );
		} , needle );
	} catch {
		return false;
	}
};

const waitForComposerDom = async( page:Page ) => {
	try {
		await page.waitForLoadState( 'domcontentloaded' , {
			timeout : 8_000,
		} );
	} catch {
		/* SPA 一直 loading 也继续探 */
	}
};

const waitForComposerCandidates = async( page:Page ) => {
	try {
		await page.waitForFunction( () => {
			return document.querySelector(
				'textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [data-placeholder], [placeholder]',
			);
		} , {
			timeout : 4_000,
		} );
	} catch {
		/* 未登录墙可能没有输入框 */
	}
};

const injectComposerHelpers = async( target:EvalTarget ) => {
	try {
		await installTsxEvalShim( target );
		await target.evaluate( installDemoComposerHelpers );
	} catch ( error ) {
		console.log( `[demo] inject composer helpers failed: ${ error instanceof Error ? error.message : String( error ) }` );
	}
};

const installDemoComposerHelpers = () => {
	const host = window as Window & {
		__CHATAIO_DEMO_COMPOSER__? : DemoComposerApi;
	};
	if( host.__CHATAIO_DEMO_COMPOSER__?.inspect ) {
		return;
	}
	const loginHint = ( value:string ) => {
		const text = value.toLowerCase();
		return /\bemail\b/.test( text )
			|| text.includes( 'password' )
			|| /\busername\b/.test( text )
			|| /\bphone\b/.test( text )
			|| /\bmobile\b/.test( text )
			|| /\btel\b/.test( text )
			|| text.includes( '邮箱' )
			|| text.includes( '密码' )
			|| text.includes( '手机' )
			|| text.includes( '验证码' )
			|| /\botp\b/.test( text )
			|| text.includes( 'sign in' )
			|| text.includes( 'log in' )
			|| text.includes( 'continue with' );
	};
	const composerHint = ( value:string ) => {
		const text = value.toLowerCase();
		return text.includes( 'message' )
			|| text.includes( 'ask' )
			|| text.includes( 'prompt' )
			|| text.includes( 'composer' )
			|| text.includes( 'chat' )
			|| text.includes( 'type' )
			|| text.includes( 'write' )
			|| text.includes( 'send a' )
			|| text.includes( '输入' )
			|| text.includes( '提问' )
			|| text.includes( '发送' );
	};
	const isLogin = ( el:Element | null ) => {
		if( !el ) {
			return false;
		}
		const type = ( el.getAttribute( 'type' ) || '' ).toLowerCase();
		if( type === 'password' || type === 'email' || type === 'tel' || type === 'hidden' ) {
			return true;
		}
		const attrs = [
			el.getAttribute( 'autocomplete' ) || '' ,
			el.getAttribute( 'name' ) || '' ,
			el.getAttribute( 'id' ) || '' ,
			el.getAttribute( 'placeholder' ) || '' ,
			el.getAttribute( 'aria-label' ) || '' ,
			el.getAttribute( 'inputmode' ) || '',
		].join( ' ' );
		return loginHint( attrs );
	};
	const isVisible = ( el:Element ) => {
		return skipReason( el ).length === 0;
	};
	const inDialog = ( el:Element ) => {
		return !!el.closest( '[role="dialog"], [role="alertdialog"]' );
	};
	const collect = ( root:Document | ShadowRoot , into:Element[] ) => {
		root.querySelectorAll(
			'textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"], input, [data-placeholder], [placeholder], [aria-placeholder]',
		).forEach( ( el ) => {
			into.push( el );
		} );
		root.querySelectorAll( 'div, p, button, span' ).forEach( ( el ) => {
			const attrs = [
				el.getAttribute( 'placeholder' ) || '' ,
				el.getAttribute( 'data-placeholder' ) || '' ,
				el.getAttribute( 'aria-placeholder' ) || '' ,
				el.getAttribute( 'aria-label' ) || '' ,
				el.id || '',
			].join( ' ' );
			if( composerHint( attrs ) ) {
				into.push( el );
			}
		} );
		root.querySelectorAll( '*' ).forEach( ( node ) => {
			const hostEl = node as HTMLElement & { shadowRoot?:ShadowRoot | null };
			if( hostEl.shadowRoot ) {
				collect( hostEl.shadowRoot , into );
			}
		} );
	};
	const skipReason = ( el:Element ) => {
		const node = el as HTMLElement;
		const rect = node.getBoundingClientRect();
		const style = window.getComputedStyle( node );
		const tag = el.tagName.toLowerCase();
		const type = ( el.getAttribute( 'type' ) || 'text' ).toLowerCase();
		if( isLogin( el ) ) {
			return 'login';
		}
		if( style.display === 'none' ) {
			return 'display-none';
		}
		if( style.visibility === 'hidden' ) {
			return 'visibility';
		}
		if( tag === 'input' && type !== 'text' && type !== 'search' && type !== '' ) {
			return `type-${ type }`;
		}
		if( rect.width < 8 && rect.height < 8 ) {
			return `tiny ${ Math.round( rect.width ) }x${ Math.round( rect.height ) }`;
		}
		return '';
	};
	const inspect = () => {
		const candidates : Element[] = [];
		collect( document , candidates );
		return candidates.slice( 0 , 12 ).map( ( el ) => {
			const rect = ( el as HTMLElement ).getBoundingClientRect();
			return {
				tag : el.tagName.toLowerCase() ,
				skip : skipReason( el ) ,
				box : `${ Math.round( rect.width ) }x${ Math.round( rect.height ) }@${ Math.round( rect.top ) }` ,
				attrs : [
					el.getAttribute( 'type' ) || '' ,
					el.getAttribute( 'placeholder' ) || '' ,
					el.getAttribute( 'data-placeholder' ) || '' ,
					el.getAttribute( 'aria-label' ) || '' ,
					el.id || '',
				].filter( Boolean ).join( '|' ).slice( 0 , 80 ),
			};
		} );
	};
	const pick = ():HTMLElement | null => {
		const candidates : Element[] = [];
		collect( document , candidates );
		let best : { el:HTMLElement; score:number } | null = null;
		const midY = window.innerHeight * 0.55;
		for( const el of candidates ) {
			if( isLogin( el ) || isVisible( el ) === false ) {
				continue;
			}
			const node = el as HTMLElement;
			const rect = node.getBoundingClientRect();
			const tag = el.tagName.toLowerCase();
			const editable = ( el.getAttribute( 'contenteditable' ) || '' ).toLowerCase();
			const role = el.getAttribute( 'role' );
			const type = ( el.getAttribute( 'type' ) || 'text' ).toLowerCase();
			if( tag === 'input' && type !== 'text' && type !== 'search' && type !== '' ) {
				continue;
			}
			const attrs = [
				el.getAttribute( 'placeholder' ) || '' ,
				el.getAttribute( 'data-placeholder' ) || '' ,
				el.getAttribute( 'aria-label' ) || '' ,
				el.getAttribute( 'id' ) || '',
			].join( ' ' );
			if( loginHint( attrs ) ) {
				continue;
			}
			const composerish = tag === 'textarea'
				|| editable === 'true'
				|| editable === 'plaintext-only'
				|| editable === ''
				|| role === 'textbox'
				|| composerHint( attrs );
			const dialogPenalty = inDialog( el ) ? 250000 : 0;
			const midBias = Math.max( 0 , 180000 - Math.abs( rect.top + rect.height / 2 - midY ) * 90 );
			const score = ( composerish ? 400000 : 0 )
				+ rect.width * rect.height
				+ midBias
				- dialogPenalty;
			if( !best || score > best.score ) {
				best = {
					el : node ,
					score,
				};
			}
		}
		return best?.el || null;
	};
	const closest = ( start:HTMLElement ) => {
		let node : HTMLElement | null = start;
		while( node ) {
			const tag = node.tagName.toLowerCase();
			const editable = ( node.getAttribute( 'contenteditable' ) || '' ).toLowerCase();
			const role = node.getAttribute( 'role' );
			if(
				tag === 'textarea'
				|| tag === 'input'
				|| editable === 'true'
				|| editable === 'plaintext-only'
				|| editable === ''
				|| role === 'textbox'
			) {
				return node;
			}
			node = node.parentElement;
		}
		return null;
	};
	const probe = () => {
		const el = pick();
		if( !el ) {
			return null;
		}
		const rect = el.getBoundingClientRect();
		return {
			x : rect.left + rect.width / 2 ,
			y : rect.top + Math.min( rect.height / 2 , 22 ) ,
			tag : el.tagName.toLowerCase() ,
			hint : (
				el.getAttribute( 'placeholder' )
				|| el.getAttribute( 'data-placeholder' )
				|| el.getAttribute( 'aria-label' )
				|| el.id
				|| ''
			).slice( 0 , 80 ),
		};
	};
	host.__CHATAIO_DEMO_COMPOSER__ = {
		probe ,
		pick ,
		closest ,
		isLogin ,
		inspect,
	};
};

import type { ElectronApplication , Frame , Page } from '@playwright/test';
import { installTsxEvalShim } from './tsx-evaluate';
