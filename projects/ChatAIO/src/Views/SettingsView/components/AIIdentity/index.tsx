/**
 * @description Settings 端「供应商 logo + 文字」组合
 *
 * - `AIIdentity`：一页实例 = logo + 用户 label（默认），custom 页自动查 `reaxel_AIFavicons` 兜底。
 * - `AIFamilyIdentity`：一个 family = logo + 显示名（Manage AIs 的 family 列、弹窗下拉选项）。
 * 见 docs/features/ai-vendor-logo-identity.md
 */
export const AIIdentity = reaxper( ( {
	ai ,
	text ,
	size = 16 ,
	className ,
	style,
}:{
	ai:Pick<AI.AIItem , 'id' | 'AI_family' | 'label' | 'url' | 'url_override'>;
	/** 缺省显示 ai.label */
	text?:React.ReactNode;
	size?:number;
	className?:string;
	style?:React.CSSProperties;
} ) => {
	const faviconUrl = reaxel_AIFavicons.store.byId[ai.id] ?? null;
	const vendor = toVendorRef( ai , faviconUrl );
	return <span
		className={ className }
		style={ { display : 'inline-flex' , alignItems : 'center' , gap : 6 , minWidth : 0 , ...style } }
		data-vendor={ ai.AI_family }
	>
		<AIVendorLogo
			family={ vendor.family }
			size={ size }
			faviconUrl={ vendor.faviconUrl }
			fallbackText={ vendorFallbackText( vendor , ai.label ) }
		/>
		<span style={ { minWidth : 0 , overflow : 'hidden' , textOverflow : 'ellipsis' , whiteSpace : 'nowrap' } }>
			{ text ?? ai.label }
		</span>
	</span>;
} );

export const AIFamilyIdentity = ( {
	family ,
	size = 16 ,
	muted = false,
}:{
	family:AI.AIFamily | string;
	size?:number;
	/** 表格 family 列用弱化色，避免与 label 列抢视觉 */
	muted?:boolean;
} ) => {
	const displayName = AIFamilyDisplayName[family as AI.AIFamily] || family;
	return <span
		className={ cn( 'inline-flex min-w-0 items-center gap-1.5' , muted && 'text-muted-foreground' ) }
		data-vendor={ family }
	>
		<AIVendorLogo family={ family } size={ size } fallbackText={ displayName }/>
		<span style={ { minWidth : 0 , overflow : 'hidden' , textOverflow : 'ellipsis' , whiteSpace : 'nowrap' } }>
			{ displayName }
		</span>
	</span>;
};

import { cn } from '#Views/shared/ui/cn.utility';
import { reaxel_AIFavicons } from '#SettingsView/reaxels/ai-favicons';
import { AIVendorLogo } from '#shared/ai-vendor-logo';
import { toVendorRef , vendorFallbackText } from '#shared/ai-vendor-logo/vendor-logo.utility';
import { AIFamilyDisplayName } from '#shared/statics/AI-family';
import type { AI } from '#src/Types/SettingsTypes/AI';
import React from 'react';
import { reaxper } from 'reaxes-react';
