class ViewCrashReporter {
	constructor(view:WebContentsView) {
		view.webContents.on('render-process-gone', (event, details) => {
			console.error('[render-process-gone]', details);
		});
	}
	
}


import type { View,WebContentsView, } from 'electron';
