const { runInExcutable,absAppRunningPath,absAppStaticsPath } = reaxel_ENV();
const { logger } = reaxel_Logger();

export const reaxel_AhkSpawner = reaxel( () => {
	
	const {
		setState : ahkSpawner_SetState, 
		store: ahkSpawner_Store,
		mutate : ahkSpawner_Mutate,
	} = orzMobx( {
		ahk : null as cp.ChildProcessWithoutNullStreams
	} );
	
	ipcMain.on( 'json' , ( event , data ) => {
		purdy( data,null );
		if(data.type === 'ahk'){
			sendMessageToAhk(JSON.stringify(data.data))
		}
	} );
	
	ipcMain.on( 'json' , ( e , data ) => {
		if( data.type === 'spawn' && data.app === 'war3-ahk' ) {
			ret.spawn();
		}
	} );
	
	ipcMain.on( 'json' , ( e , json ) => {
		if( json.type === 'exit-ahk' ) {
			ret.killAhk();
		}
	} );
	
	
	
	const sendMessageToAhk = function () {
		let opened = false;
		return ( message: string ) => {
			if( opened || !ahkSpawner_Store.ahk) {
				return;
			}
			opened = true;
			ahkSpawner_Store.ahk.stdin.write( message , () => {
				opened = false;
			} );
		};
	}();
	
	const killAhk = () => {
		const {ahk} = ahkSpawner_Store
		if(ahk){
			mainWindowLoaded.then( win => {
				win.webContents.send( 'console' , ahk.pid );
			} );
			ahk.stdin.end(() => {
				ahk.kill();
			});
			process.kill( ahk.pid );
			ahk.kill();
		}
	}
	
	
	const ret = {
		ahkSpawner_SetState,
		ahkSpawner_Store,
		ahkSpawner_Mutate,
		killAhk,
		sendMessageToAhk,
		spawn() {
			if( !ahkSpawner_Store.ahk ) {
				ahkSpawner_SetState( {
					ahk : spawnWar3AHK( { ahkSpawner_SetState , ahkSpawner_Store }) ,
				} );
				mainWindowLoaded.then( ( mainWindow ) => {
					mainWindow.webContents.send( 'json' , {
						type : 'child_process-spawned' ,
					} );
				} );
			}else {
				console.warn('ahk进程已在运行中,不可重复调起多个实例');
			}
			return ahkSpawner_Store.ahk;
		},
	};
	
	return () => {
		
		return ret;
	};
} );

setTimeout( () => {
	mainWindowLoaded.then( win => {
		win.webContents.send( 'console' , path.join(absAppStaticsPath,'ahk-scripts/war3.ahk'));
		
		
		
		const isDev = process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath);
		if (isDev) {
			console.log("Running in development");
		} else {
			console.log("Running in production");
		}
		
		
		win.webContents.send( 'console' , isDev ? 'development' : 'production');
	} );
	
} );

const staticsPath = path.join(app.getAppPath(),'../statics')

function spawnWar3AHK( { ahkSpawner_SetState , ahkSpawner_Store }){
	
	logger.log('ahk-path:',path.join(absAppStaticsPath, runInExcutable ? `ahk-scripts/AutoHotkey64.exe` : `statics/ahk-scripts/AutoHotkey64.exe`));
	
	const ahkexe = path.join(absAppStaticsPath ,`ahk-scripts/AutoHotkey64.exe`);
	const ahkScriptPath = path.join(absAppStaticsPath ,"ahk-scripts/war3.ahk");
	const ahk = cp.spawn( ahkexe , [ahkScriptPath] );
	
	ahkSpawner_SetState( {ahk} );
	
	ahk.stdout.on( 'data' , ( data ) => {
		Buffer.isBuffer( data ) && (data = data.toString());
		console.log(chalk.green(data));
		// const json = JSON.parse( data );
	} );
	ahk.stderr.on( 'error' , ( data ) => {
		console.log( `报错信息:${ data }` );
	} );
	ahk.stderr.on( 'data' , ( data ) => {
		console.log( data );
	} );
	ahk.on('error', (err) => {
		console.error('Failed to start subprocess.', err);
		mainWindowLoaded.then( win => {
			win.webContents.send( 'console' , `'Failed to start subprocess.', ${err}`);
		} );
	});
	ahk.on( 'close' , ( e ) => {
		mainWindowLoaded.then( win => {
			win.webContents.send( 'json' , {
				type : "child_process-closed" ,
			} );
			win.webContents.send( 'console' , `'child_process-closed.', ${e}`);
		} );
		ahkSpawner_SetState( { ahk : null } );
		console.log( 'closed......................' );
	} );
	return ahk;
}

type MessageTypes = 
	//传输数据
	"transfer" |
	
	"stop";



import { reaxel_ENV } from '#reaxels/env';
import { reaxel_Logger } from '#reaxels/debuggers';
import { mainWindowLoaded } from '../../Main/initialize-main-window';
import { ipcRenderer , ipcMain ,app} from 'electron';
import path,{} from 'path';
import process from 'node:process';
import cp,{} from 'node:child_process';
import purdy from 'purdy';
import chalk from 'chalk';
