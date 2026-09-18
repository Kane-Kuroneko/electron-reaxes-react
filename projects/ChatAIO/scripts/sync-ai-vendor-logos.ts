/**
 * @description 从 @lobehub/icons-static-svg / -static-png（MIT）同步 AI 供应商 logo 到仓库。
 *
 * - SVG → `src/shared/ai-vendor-logo/icons/<family>.component.svg`（走 @svgr/webpack 变 React 组件；
 *   单色图标 fill=currentColor，自动跟随主题文字色）
 * - PNG → `statics/ai-logos/{light,dark}/<family>.png`（tray 原生菜单 nativeImage 用；
 *   light = 黑 logo（浅色菜单底），dark = 白 logo（深色菜单底））
 *
 * 产物入库；lobe-icons 升级后重跑本脚本即可：
 *   yarn tsx projects/ChatAIO/scripts/sync-ai-vendor-logos.ts
 *
 * custom / dev-proxy-test 没有品牌 logo，不在此映射内（favicon / 首字母兜底，见
 * docs/features/ai-vendor-logo-identity.md）。
 */

/** family → lobe-icons 文件名（无扩展名）。有品牌彩色版优先，否则单色（currentColor）。 */
const VENDOR_LOGO_SOURCES:Record<string , string> = {
	chatgpt : 'openai' ,
	grok : 'grok' ,
	gemini : 'gemini-color' ,
	deepseek : 'deepseek-color' ,
	perplexity : 'perplexity-color' ,
	claude : 'claude-color' ,
	manus : 'manus' ,
	aistudio : 'aistudio' ,
	copilot : 'copilot-color' ,
	'meta-ai' : 'metaai-color' ,
	poe : 'poe-color' ,
	mistral : 'mistral-color' ,
	doubao : 'doubao-color' ,
	qianwen : 'qwen-color' ,
	kimi : 'kimi-color' ,
	chatglm : 'chatglm-color' ,
	yuanbao : 'yuanbao-color' ,
	hailuo : 'hailuo-color' ,
	yiyan : 'wenxin-color',
};

const scriptDir = path.dirname( fileURLToPath( import.meta.url ) );
const chatAioRoot = path.resolve( scriptDir , '..' );
const repoRoot = path.resolve( chatAioRoot , '../..' );
const svgSourceDir = path.join( repoRoot , 'node_modules' , '@lobehub' , 'icons-static-svg' , 'icons' );
const pngSourceRoot = path.join( repoRoot , 'node_modules' , '@lobehub' , 'icons-static-png' );
const svgTargetDir = path.join( chatAioRoot , 'src' , 'shared' , 'ai-vendor-logo' , 'icons' );
const pngTargetRoot = path.join( chatAioRoot , 'statics' , 'ai-logos' );

const syncAll = () => {
	fs.mkdirSync( svgTargetDir , { recursive : true } );
	for( const theme of [ 'light' , 'dark' ] as const ) {
		fs.mkdirSync( path.join( pngTargetRoot , theme ) , { recursive : true } );
	}
	const missing:string[] = [];
	for( const [ family , source ] of Object.entries( VENDOR_LOGO_SOURCES ) ) {
		const svgSource = path.join( svgSourceDir , `${ source }.svg` );
		if( !fs.existsSync( svgSource ) ) {
			missing.push( svgSource );
			continue;
		}
		fs.copyFileSync( svgSource , path.join( svgTargetDir , `${ family }.component.svg` ) );
		for( const theme of [ 'light' , 'dark' ] as const ) {
			const pngSource = path.join( pngSourceRoot , theme , `${ source }.png` );
			if( !fs.existsSync( pngSource ) ) {
				missing.push( pngSource );
				continue;
			}
			fs.copyFileSync( pngSource , path.join( pngTargetRoot , theme , `${ family }.png` ) );
		}
	}
	if( missing.length ) {
		throw new Error( `lobe-icons 缺少以下源文件：\n${ missing.join( '\n' ) }` );
	}
	console.log( `[sync-ai-vendor-logos] synced ${ Object.keys( VENDOR_LOGO_SOURCES ).length } vendors.` );
};

syncAll();

import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
