/**
 * Electron ≥41：WebContentsView.webContents 在 destroyed 之后会变成 undefined
 *（electron#50249 / #47074）。直接写 `view.webContents.isDestroyed()` 会在回前台等路径抛：
 * `Cannot read properties of undefined (reading 'isDestroyed')`。
 */
export function isWebContentsViewDead(
	view: WebContentsView | null | undefined,
): boolean {
	if( !view ) {
		return true;
	}
	const webContents = view.webContents;
	if( !webContents ) {
		return true;
	}
	try {
		return webContents.isDestroyed();
	} catch {
		return true;
	}
}

/** 类型收窄：view 存在且 webContents 仍可用 */
export function isWebContentsViewAlive(
	view: WebContentsView | null | undefined,
): view is WebContentsView {
	return !isWebContentsViewDead( view );
}

export function getAliveWebContents(
	view: WebContentsView | null | undefined,
): WebContents | null {
	if( !isWebContentsViewAlive( view ) ) {
		return null;
	}
	return view.webContents;
}

import type {
	WebContents ,
	WebContentsView,
} from 'electron';
