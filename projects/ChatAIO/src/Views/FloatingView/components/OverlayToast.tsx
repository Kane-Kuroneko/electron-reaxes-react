/**
 * FloatingView 全局 toast。禁止引入 Tailwind Preflight / sonner。
 * 走 global-message:show，自写定位层。见 docs/features/settings-ui-shadcn.md
 */
export const OverlayToast = reaxper( () => {
	const toast = reaxel_FloatingView.store.overlayToast;
	if( toast.visible === false ) {
		return null;
	}
	const palette = TOAST_PALETTE[toast.type] || TOAST_PALETTE.info;
	return <div
		style={ {
			position : 'fixed' ,
			top : 20 ,
			left : '50%' ,
			transform : 'translateX(-50%)' ,
			zIndex : 9999 ,
			pointerEvents : 'none' ,
			maxWidth : 420 ,
			padding : '8px 14px' ,
			borderRadius : 8 ,
			background : palette.bg ,
			color : palette.fg ,
			boxShadow : '0 8px 24px rgba(0,0,0,0.28)' ,
			fontSize : 13 ,
			lineHeight : '18px' ,
			textAlign : 'center' ,
		} }
	>
		{ toast.content }
	</div>;
} );

const TOAST_PALETTE = {
	success : { bg : '#162312' , fg : '#b7eb8f' } ,
	error : { bg : '#2a1215' , fg : '#ffa39e' } ,
	warning : { bg : '#2b2111' , fg : '#ffe58f' } ,
	info : { bg : '#111a2c' , fg : '#91caff' } ,
} as const;

import { reaxel_FloatingView } from '#FloatingView/reaxels/floating-view';
import { reaxper } from 'reaxes-react';
