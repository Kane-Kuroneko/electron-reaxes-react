/**
 * @description AI 供应商 logo 统一组件
 *
 * 重构后用户 label 不再承载厂商标识（chatgpt-Jack → <GPT logo> Jack），所有辨识供应商的
 * UI（menubar Switch AI 菜单、Current AI 中区、SwitchAiBar 卡片、Settings Manage AIs 表、
 * GuidingView）统一渲染本组件。
 *
 * - 19 个内置 family：lobe-icons（MIT）打包 SVG，经 @svgr/webpack 变 React 组件；
 *   单色图标（chatgpt/grok/manus/aistudio）fill=currentColor 自动跟随主题文字色。
 * - custom / dev-proxy-test / 未知 family：faviconUrl 可用则显示 favicon，
 *   加载失败或缺省退回「域名/label 首字母」圆形占位。
 *
 * 图标产物由 `scripts/sync-ai-vendor-logos.ts` 同步入库。
 * 设计文档：docs/features/ai-vendor-logo-identity.md
 */

export type AIVendorLogoProps = {
	family:string;
	/** 图标边长 px，默认 16 */
	size?:number;
	/** custom family 的站点 favicon（data: 或 https:），失败自动退首字母 */
	faviconUrl?:string | null;
	/** 首字母兜底的取字来源（label 或域名）；缺省用 family 首字母 */
	fallbackText?:string;
	className?:string;
	style?:React.CSSProperties;
	title?:string;
};

export const AIVendorLogo = ( {
	family ,
	size = 16 ,
	faviconUrl ,
	fallbackText ,
	className ,
	style ,
	title,
}:AIVendorLogoProps ) => {
	const VendorSvg = VENDOR_LOGO_COMPONENTS[family];
	const hostStyle:React.CSSProperties = {
		display : 'inline-flex' ,
		alignItems : 'center' ,
		justifyContent : 'center' ,
		width : size ,
		height : size ,
		flex : 'none' ,
		lineHeight : 1 ,
		verticalAlign : '-0.125em' ,
		...style,
	};

	if( VendorSvg ) {
		/* lobe-icons svg 是 1em 方形，用 fontSize 控制尺寸 */
		return <span
			className={ className }
			style={ { ...hostStyle , fontSize : size } }
			title={ title }
		><VendorSvg/></span>;
	}
	return <FaviconOrLetter
		key={ faviconUrl || '' }
		size={ size }
		faviconUrl={ faviconUrl }
		letter={ resolveFallbackLetter( fallbackText , family ) }
		hostStyle={ hostStyle }
		className={ className }
		title={ title }
	/>;
};

/** favicon 优先、onError 退首字母的占位实现 */
const FaviconOrLetter = ( {
	size ,
	faviconUrl ,
	letter ,
	hostStyle ,
	className ,
	title,
}:{
	size:number;
	faviconUrl?:string | null;
	letter:string;
	hostStyle:React.CSSProperties;
	className?:string;
	title?:string;
} ) => {
	const [ faviconFailed , setFaviconFailed ] = React.useState( false );
	const showFavicon = Boolean( faviconUrl ) && !faviconFailed;

	if( showFavicon ) {
		return <span className={ className } style={ hostStyle } title={ title }>
			<img
				src={ faviconUrl! }
				width={ size }
				height={ size }
				style={ { display : 'block' , borderRadius : Math.round( size / 8 ) } }
				onError={ () => setFaviconFailed( true ) }
				alt=""
			/>
		</span>;
	}
	return <span
		className={ className }
		title={ title }
		style={ {
			...hostStyle ,
			borderRadius : '50%' ,
			background : 'var(--chataio-vendor-letter-bg, rgba(128, 128, 128, 0.18))' ,
			color : 'var(--chataio-vendor-letter-color, currentColor)' ,
			fontSize : Math.max( 9 , Math.round( size * 0.58 ) ) ,
			fontWeight : 600 ,
			userSelect : 'none',
		} }
	>{ letter }</span>;
};

const resolveFallbackLetter = ( fallbackText:string | undefined , family:string ) => {
	const source = ( fallbackText || '' ).trim() || family;
	/* 域名去协议 / www 后取首字符 */
	const cleaned = source
		.replace( /^[a-z][a-z0-9+.-]*:\/\//i , '' )
		.replace( /^www\./i , '' );
	return ( cleaned.charAt( 0 ) || '?' ).toUpperCase();
};

/** 内置 family → 打包 SVG 组件。custom / dev-proxy-test 走 favicon / 首字母。 */
const VENDOR_LOGO_COMPONENTS:Record<string , React.FC<React.SVGProps<SVGSVGElement>>> = {
	chatgpt : ChatgptLogo ,
	grok : GrokLogo ,
	gemini : GeminiLogo ,
	deepseek : DeepseekLogo ,
	perplexity : PerplexityLogo ,
	claude : ClaudeLogo ,
	manus : ManusLogo ,
	aistudio : AistudioLogo ,
	copilot : CopilotLogo ,
	'meta-ai' : MetaAiLogo ,
	poe : PoeLogo ,
	mistral : MistralLogo ,
	doubao : DoubaoLogo ,
	qianwen : QianwenLogo ,
	kimi : KimiLogo ,
	chatglm : ChatglmLogo ,
	yuanbao : YuanbaoLogo ,
	hailuo : HailuoLogo ,
	yiyan : YiyanLogo,
};

import ChatgptLogo from './icons/chatgpt.component.svg';
import GrokLogo from './icons/grok.component.svg';
import GeminiLogo from './icons/gemini.component.svg';
import DeepseekLogo from './icons/deepseek.component.svg';
import PerplexityLogo from './icons/perplexity.component.svg';
import ClaudeLogo from './icons/claude.component.svg';
import ManusLogo from './icons/manus.component.svg';
import AistudioLogo from './icons/aistudio.component.svg';
import CopilotLogo from './icons/copilot.component.svg';
import MetaAiLogo from './icons/meta-ai.component.svg';
import PoeLogo from './icons/poe.component.svg';
import MistralLogo from './icons/mistral.component.svg';
import DoubaoLogo from './icons/doubao.component.svg';
import QianwenLogo from './icons/qianwen.component.svg';
import KimiLogo from './icons/kimi.component.svg';
import ChatglmLogo from './icons/chatglm.component.svg';
import YuanbaoLogo from './icons/yuanbao.component.svg';
import HailuoLogo from './icons/hailuo.component.svg';
import YiyanLogo from './icons/yiyan.component.svg';
import React from 'react';
