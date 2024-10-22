export const reaxel_AhkSpawner = reaxel( () => {
	
	const {
		setState : ahkSpawner_SetState, 
		store: ahkSpawner_Store,
		mutate : ahkSpawner_Mutate,
	} = orzMobx( {
		ahk : null as cp.ChildProcessWithoutNullStreams
	} );
	
	ipcMain.on( 'json' , ( event , data ) => {
		purdy( data );
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
			ahkSpawner_Store.ahk.stdin.end(() => {
				ahk.kill();
			});
			
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




function spawnWar3AHK( { ahkSpawner_SetState , ahkSpawner_Store }){
	const ahkexe = `AutoHotkey64.exe`;
	const absoluteScriptPath = path.join( __dirname , './ahk-scripts/war3.ahk' );
	const ahk = cp.spawn( ahkexe , [absoluteScriptPath] );
	
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
	});
	ahk.on( 'close' , ( e ) => {
		mainWindowLoaded.then( ( mainWindow ) => {
			mainWindow.webContents.send( 'json' , {
				type : "child_process-closed" ,
			} );
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

import { mainWindowLoaded } from '../../Main/initialize-main-window';
import { ipcRenderer , ipcMain } from 'electron';
import path,{} from 'path';
import process from 'node:process';
import cp,{} from 'node:child_process';
import purdy from 'purdy';
import chalk from 'chalk';
