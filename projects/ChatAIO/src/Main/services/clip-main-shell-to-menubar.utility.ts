/**
 * 将 BrowserWindow 内置主壳 WebContentsView 裁到仅 menubar 高度。
 *
 * 背景（公开讨论）：
 * - electron#41002 / #43320：底层 view 的 `-webkit-app-region: drag` 会参与父窗口
 *   HTCAPTION 命中，不理会上层 WCV 的遮挡；内容区与主壳在屏幕坐标重叠时，
 *   就会出现「内容区左上角透明矩形可拖窗、点不到页面」。
 * - electron#51176/#51200：hidden WCV 的 drag 仍生效（41.2.1+ 已修可见性）；
 *   但主壳若仍是**全窗** native bounds，其 drag 面仍可能与内容区叠命中。
 *
 * ChatAIO 主壳只渲染 menubar，却默认占满 client area。把主壳 View 裁到
 * `y=0..menuBarHeight` 后，内容区（y≥menuBarHeight）下不再有主壳 drag provider。
 *
 * @returns 是否成功找到并设置了主壳 View
 */
export const clipMainShellToMenuBar = (win:BrowserWindow):boolean => {
	if( !win || win.isDestroyed() ) {
		return false;
	}
	const menuBarHeight = getMenuBarHeight();
	const { width } = win.getContentBounds();
	const target = {
		x : 0 ,
		y : 0 ,
		width : Math.max( 1 , width ) ,
		height : menuBarHeight ,
	};

	const shellView = findMainShellWebContentsView( win );
	if( !shellView ) {
		return false;
	}
	if( !isSameBounds( shellView.getBounds() , target ) ) {
		shellView.setBounds( target );
	}
	return true;
};

export const bindMainShellMenuBarClip = (win:BrowserWindow) => {
	const apply = () => {
		clipMainShellToMenuBar( win );
	};
	apply();
	win.on( 'resize' , apply );
	win.on( 'maximize' , apply );
	win.on( 'unmaximize' , apply );
	win.on( 'enter-full-screen' , apply );
	win.on( 'leave-full-screen' , apply );
	win.webContents.on( 'did-finish-load' , apply );
	win.webContents.on( 'dom-ready' , apply );
};

const findMainShellWebContentsView = (win:BrowserWindow):WebContentsView | null => {
	const match = (view:View):WebContentsView | null => {
		if( isWebContentsView( view ) && view.webContents === win.webContents ) {
			return view;
		}
		for( const child of view.children ) {
			const found = match( child );
			if( found ) {
				return found;
			}
		}
		return null;
	};

	const fromContent = match( win.contentView );
	if( fromContent ) {
		return fromContent;
	}

	/* Electron ≥30：主壳 WebContentsView 常为 contentView 的兄弟（#41256） */
	const parent = ( win.contentView as View & { parent?:View } ).parent;
	if( parent ) {
		return match( parent );
	}
	return null;
};

const isWebContentsView = (view:View):view is WebContentsView => {
	return view instanceof WebContentsView;
};

const isSameBounds = (a:Rectangle , b:Rectangle) => {
	return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
};


import { getMenuBarHeight } from '#src/shared/menubar-geometry';
import {
	type BrowserWindow ,
	type Rectangle ,
	type View ,
	WebContentsView ,
} from 'electron';
