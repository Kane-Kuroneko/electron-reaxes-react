/**
 * 客户区是否可作为 WebContentsView 布局源。
 *
 * Windows 把已最大化窗口最小化时，会先 `resize` 并把 `getContentBounds()` 报成
 * `0×0`（坐标落到 -17061 一类占位）。若此时仍 `setBounds(Math.max(1, 0))`，
 * 中心 WCV 会被收到 1×1；还原最大化时再拉回全屏，DWM 第一帧就是近白衬底。
 * 窗口化最小化通常不发这条 resize，WCV 保持原尺寸，所以不闪。
 *
 * 坍缩客户区不是 layout 源：保持上一帧可用 bounds，交给 Chromium WasShown。
 */
export const MIN_USABLE_WINDOW_CONTENT_EDGE = 32;

export const isCollapsedWindowContentRect = (
	rect:{ width:number; height:number } | null | undefined,
):boolean => {
	if( !rect ) {
		return true;
	}
	return rect.width < MIN_USABLE_WINDOW_CONTENT_EDGE
		|| rect.height < MIN_USABLE_WINDOW_CONTENT_EDGE;
};

export const hasUsableBrowserWindowContent = (
	win:BrowserWindow | null | undefined,
):boolean => {
	try {
		if( !win || win.isDestroyed() || win.isMinimized() ) {
			return false;
		}
		return !isCollapsedWindowContentRect( win.getContentBounds() );
	} catch {
		return false;
	}
};


import type { BrowserWindow } from 'electron';
