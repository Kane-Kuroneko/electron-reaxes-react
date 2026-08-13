app.commandLine.appendSwitch( 'disable-blink-features' , 'AutomationControlled' );

if(dev()){
	/*
	 * CDP port is a strong BotGuard / automation signal. Keep off by default even in
	 * unpackaged runs; set CHATAIO_REMOTE_DEBUG=1 when you explicitly need DevTools attach.
	 */
	if( process.env.CHATAIO_REMOTE_DEBUG === '1' ) {
		app.commandLine.appendSwitch('remote-debugging-port', '9222');
		app.commandLine.appendSwitch('remote-allow-origins', '*');
	}
	// Dev webpack HTTPS (localhost:4444) uses mkcert certs; Chromium rejects them unless
	// the local CA is trusted. NODE_TLS_REJECT_UNAUTHORIZED only covers Node, not webContents.
	app.commandLine.appendSwitch('ignore-certificate-errors');
}

// app.commandLine.appendSwitch('ignore-gpu-blacklist');
// app.commandLine.appendSwitch('disable-gpu-sandbox');
// app.commandLine.appendSwitch('enable-features', 'DirectComposition,SkiaGraphite,UseSkiaRenderer,RawDraw');
if( process.platform === 'win32' ) {
	/*
	 * 降低 Alt-Tab 遮挡时 Chromium 把窗口标成 occluded 并停绘的概率。
	 * 回前台禁止 remount/±1 踢绘；内容 view 使用默认 backgroundThrottling（true），
	 * 走正常 WasHidden/WasShown。见 ai-view-foreground-white-flash.md。
	 */
	app.commandLine.appendSwitch( 'disable-features' , 'CalculateNativeWinOcclusion' );
}
// app.commandLine.appendSwitch('force-color-profile', 'srgb'); // 避免 color management 开销


import { app } from "electron";
import { dev } from 'electron-is';
