/**
 * @description AI 页 HTML5 通知 → 任务栏注意力转发
 *
 * ai-page-preload 在 AI 页 main world 包了一层 `Notification`，页面每发一条通知
 * 就走 `ai-page-notification` IPC 上报到这里（原生 OS 通知照常弹，这里只补「引起注意」）。
 *
 * 当前阶段（最小实现）：
 * - Windows / Linux：主窗未聚焦时 `flashFrame(true)` 闪任务栏图标，窗口重获焦点即停；
 * - macOS：`app.dock.bounce('informational')` 弹一次 dock。
 * 更完整的通知聚合 / 转发（角标计数、通知中心等）后续再做。
 *
 * 设计文档：docs/features/ai-notification-taskbar-flash.md
 */

let initialized = false;
let flashing = false;

export const initAINotificationAttention = () => {
	if( initialized ) {
		return;
	}
	initialized = true;
	useIpcRendererToMain( 'ai-page-notification' ).on( ( _meta , payload ) => {
		/* 入站运行时校验：preload 已裁剪字段，这里仍防御非法 payload。 */
		if( !payload || typeof payload.title !== 'string' ) {
			return;
		}
		requestUserAttention();
	} );
};

/** 主窗未聚焦时才提醒；用户正看着应用则不打扰。 */
const requestUserAttention = () => {
	if( !mainWindow || mainWindow.isDestroyed() || mainWindow.isFocused() ) {
		return;
	}
	if( process.platform === 'darwin' ) {
		app.dock?.bounce( 'informational' );
		return;
	}
	mainWindow.flashFrame( true );
	if( !flashing ) {
		flashing = true;
		mainWindow.once( 'focus' , () => {
			flashing = false;
			if( mainWindow && !mainWindow.isDestroyed() ) {
				mainWindow.flashFrame( false );
			}
		} );
	}
};

import { mainWindow } from '#main/mainWindow';
import { useIpcRendererToMain } from '#main/services/ipc';
import { app } from 'electron';
