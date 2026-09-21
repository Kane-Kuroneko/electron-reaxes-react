app.commandLine.appendSwitch( 'disable-blink-features' , 'AutomationControlled' );

if(dev()){
	/*
	 * CDP port is a strong BotGuard / automation signal. Keep off by default even in
	 * unpackaged runs; set CHATAIO_REMOTE_DEBUG=1 when you explicitly need DevTools attach.
	 */
	if( process.env.CHATAIO_REMOTE_DEBUG === '1' ) {
		const cdpPort = process.env.ELECTRON_CDP_PORT || '9222';
		app.commandLine.appendSwitch('remote-debugging-port', cdpPort);
		app.commandLine.appendSwitch('remote-allow-origins', '*');
	}
	// Dev webpack HTTPS uses mkcert certs; Chromium rejects them unless
	// the local CA is trusted. NODE_TLS_REJECT_UNAUTHORIZED only covers Node, not webContents.
	// 端口以 dist/.webpack-build-state.json 为准，见 docs/architecture/worktree-dev-server.md
	app.commandLine.appendSwitch('ignore-certificate-errors');
}

// app.commandLine.appendSwitch('ignore-gpu-blacklist');
// app.commandLine.appendSwitch('disable-gpu-sandbox');
// app.commandLine.appendSwitch('enable-features', 'DirectComposition,SkiaGraphite,UseSkiaRenderer,RawDraw');
// app.commandLine.appendSwitch('force-color-profile', 'srgb'); // 避免 color management 开销


import { app } from "electron";
import { dev } from 'electron-is';
