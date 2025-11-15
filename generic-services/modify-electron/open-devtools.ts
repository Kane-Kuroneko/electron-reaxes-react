export const useOpenDevtools = (window: BrowserWindow, options: Options) => {
	app.whenReady().then(() => {
		let devtoolsPosition = options.devtoolsOptions?.mode ?? 'left';
		window.webContents.on('devtools-closed', () => {
			if (options.width && (devtoolsPosition === 'left' || devtoolsPosition === 'right')) {
				const bounds = window.getBounds();
				const delta = options.width;
				const newWidth = bounds.width - delta;
				const newX = bounds.x + Math.floor(delta / 2);
				window.setBounds({
					x: newX,
					y: bounds.y,
					width: newWidth,
					height: bounds.height
				});
			}
			// Similar logic can be added for 'bottom' mode using options.height if needed.
		});
		window.webContents.on('devtools-opened', () => {
			if (options.width && (devtoolsPosition === 'left' || devtoolsPosition === 'right')) {
				const bounds = window.getBounds();
				const delta = options.width;
				const newWidth = bounds.width + delta;
				const newX = bounds.x - Math.floor(delta / 2);
				window.setBounds({
					x: newX,
					y: bounds.y,
					width: newWidth,
					height: bounds.height
				});
			}
			// Similar logic can be added for 'bottom' mode using options.height if needed.
		});
		window.webContents.openDevTools({ mode: devtoolsPosition });
	});
}


export type Options = {
	width? : number;
	bounds?: Rectangle;
	center? : "auto" | boolean ,
	devtoolsOptions? : OpenDevToolsOptions
}


import { app } from 'electron';
import { BrowserWindow ,OpenDevToolsOptions } from 'electron';
import type { Rectangle } from 'electron';
