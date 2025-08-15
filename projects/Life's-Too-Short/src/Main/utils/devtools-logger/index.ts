let promise = createPromiseWithState<BrowserWindow>();
/**
 * 会将main的log发送至mainWindow的devtools异步打印
 */
export const IPCLogger = ( ...log: any ) => {
	app.whenReady().then(() => {
		
		const browserWindows = BrowserWindow.getAllWindows();
		
		console.log(browserWindows.length,'gxxxxxxx');
		browserWindows.forEach( async ( win ) => {
			console.log(1111111111111111);
			await new Promise( ( resolve , reject ) => {
				win.webContents.on( 'did-finish-load' , () => {
					resolve(null);
				} );
			} );
			win.webContents.send( 'console' , ...log );
		} );
	});
	
};
IPCLogger();

export const logToRenderer:Console = Object.keys(console).reduce((accu,key) => {
	accu[key] = (...args) => {
		
		const _args = [];
		
		args.forEach((a) => {
			try {
				_args.push( serializeForRenderer( a ) );
			}catch{}
		})
		
		app.whenReady().then(() => {
			const browserWindows = BrowserWindow.getAllWindows();
			browserWindows.forEach( async ( win ) => {
				await new Promise( ( resolve , reject ) => {
					win.webContents.on( 'did-finish-load' , () => {
						resolve(null);
					} );
				} );
				win.webContents.executeJavaScript( `console.${key}(${args.join(',')})`);
			} );
		});
	}
	return accu;
},{} as Console);

reaxel_MainProcessHub().observedMainWindow( ( win ) => {
	if( win ) {
		if( promise.state === 'fulfilled' ) {
			promise = createPromiseWithState<BrowserWindow>();
		}else if(promise.state === 'pending'){
			
		}
		win.webContents.on('did-finish-load',() => {
			promise.resolve(win);
		})
		// promise.resolve( win );
	}
} );

function createPromiseWithState<T extends any>() {
	type PromiseState =
		| 'pending'
		| 'fulfilled'
		| 'rejected';
	
	const p: XPromise<T> & { state?: PromiseState; } = xPromise();
	p.state = 'pending';
	
	p.then( () => p.state = "fulfilled" );
	p.catch( () => p.state = 'rejected' );
	return p;
};
// main -> renderer 通用数据转换函数
function serializeForRenderer(input: unknown): unknown {
	function replacer(_: string, value: unknown): unknown {
		if (typeof value === 'function') {
			return `[Function: ${value.name || 'anonymous'}]`;
		}
		
		if (value instanceof Error) {
			return {
				__type: 'Error',
				name: value.name,
				message: value.message,
				stack: value.stack,
			};
		}
		
		if (typeof value === 'bigint') {
			return value.toString() + 'n';
		}
		
		if (value instanceof Map) {
			return {
				__type: 'Map',
				value: Array.from(value.entries()),
			};
		}
		
		if (value instanceof Set) {
			return {
				__type: 'Set',
				value: Array.from(value as Set<any>),
			};
		}
		
		if (value instanceof Date) {
			return {
				__type: 'Date',
				value: value.toISOString(),
			};
		}
		
		return value;
	}
	
	try {
		const json = JSON.stringify(input, replacer);
		return JSON.parse(json);
	} catch {
		return { __error: 'Unserializable data' };
	}
}


import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import {app, BrowserWindow } from 'electron';
import { XPromise } from 'reaxes-utils';
