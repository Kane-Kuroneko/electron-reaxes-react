const { runInExcutable , absAppRunningPath , absAppStaticsPath } = reaxel_ElectronENV();

export const reaxel_AhkSpawner = reaxel( () => {
	
	const {
		setState ,
		store ,
		mutate ,
	} = orzMobx( {
		ahk : null as cp.ChildProcessWithoutNullStreams ,
	} );
	
	ipcMain.on( 'json' , ( event , data ) => {
		purdy( data , null );
		if( data.type === 'ahk' ) {
			sendMessageToAhk( JSON.stringify( data.data ) );
		}
	} );
	
	ipcMain.on( 'json' , ( e , data ) => {
		if( data.type === 'spawn' && data.data === 'war3-ahk' ) {
			ret.spawn();
		}
	} );
	
	ipcMain.on( 'json' , ( e , data ) => {
		if( data.type === 'exit-ahk' ) {
			ret.shutdown();
		}
	} );
	
	obsReaction( ( first , disposer ) => {
		if( first ) return;
		const { ahk } = store;
		if( ahk ) {
			ahk.stdout.on( 'data' , ( data ) => {
				const { serverTime } = reaxel_ServerTime();
			} );
		}
	} , () => [
		store.ahk ,
	] );
	
	
	const sendMessageToAhk = function () {
		let opened = false;
		return ( message: string ) => {
			if( opened || !store.ahk ) {
				return;
			}
			opened = true;
			store.ahk.stdin.write( message , () => {
				opened = false;
			} );
		};
	}();
	
	const shutdown = () => {
		const { ahk } = store;
		if( ahk ) {
			
			IPCLogger( 'pid:' , ahk.pid );
			
			ahk.stdin.end( () => {
				ahk.kill();
			} );
			process.kill( ahk.pid );
			ahk.kill();
		}
	};
	
	
	const ret = {
		
		ahkSpawner_Store : store ,
		ahkSpawner_SetState : setState ,
		ahkSpawner_Mutate : mutate ,
		shutdown ,
		sendMessageToAhk ,
		spawn() {
			if( !store.ahk ) {
				setState( {
					ahk : spawnWar3AHK( { ahkSpawner_SetState : setState , ahkSpawner_Store : store } ) ,
				} );
				mainWindowLoaded.then( ( mainWindow ) => {
					mainWindow.webContents.send( 'json' , {
						type : 'ahk-cp-status' ,
						data : true ,
					} );
				} );
			} else {
				console.warn( 'ahk进程已在运行中,不可重复调起多个实例' );
			}
			return store.ahk;
		} ,
	};
	
	return () => {
		
		return ret;
	};
} );

setTimeout( () => {
	
	IPCLogger( path.join( absAppStaticsPath , 'ahk-scripts/war3.ahk' ) );
	
	mainWindowLoaded.then( win => {
		
		const isDev = process.defaultApp || /node_modules[\\/]electron[\\/]/.test( process.execPath );
		if( isDev ) {
			console.log( "Running in development" );
		} else {
			console.log( "Running in production" );
		}
		
		
		IPCLogger( isDev ? 'development' : 'production' );
	} );
	
} );

const staticsPath = path.join( app.getAppPath() , '../statics' );

function spawnWar3AHK( { ahkSpawner_SetState , ahkSpawner_Store } ) {
	
	// IPCLogger( 'ahk-path:' , path.join( absAppStaticsPath , runInExcutable ? `ahk-scripts/AutoHotkey64.exe` : `statics/ahk-scripts/AutoHotkey64.exe` ) );
	
	const ahkexe = path.join( absAppStaticsPath , `assets/ahk-scripts/AutoHotkey64.exe` );
	const ahkScriptPath = path.join( absAppStaticsPath , "assets/ahk-scripts/war3.ahk" );
	const ahk = cp.spawn( ahkexe , [ ahkScriptPath ] , {
		stdio : [ 'pipe' , 'pipe' , 'pipe' ] , // 确保 stdin, stdout 和 stderr 都连接
	} );
	
	ahkSpawner_SetState( { ahk } );
	
	ahk.stdin.setDefaultEncoding( 'utf8' ); // 设置编码为字符串
	ahk.stdin.on( 'data' , ( data ) => {
		console.log( 'stdin:data--> ' , data );
	} );
	ahk.stdout.on( 'data' , ( data ) => {
		Buffer.isBuffer( data ) && (
			data = data.toString()
		);
		console.log( 'ahk.stdout-> ' , chalk.green( data ) );
		// const json = JSON.parse( data );
	} );
	ahk.stderr.on( 'error' , ( data ) => {
		console.log( `报错信息:${ data }` );
	} );
	ahk.stderr.on( 'data' , ( data ) => {
		console.log( data );
	} );
	ahk.on( 'error' , ( err ) => {
		console.error( 'Failed to start subprocess.' , err );
		IPCLogger( `'Failed to start subprocess.', ${ err }` );
	} );
	ahk.on( 'close' , ( e ) => {
		mainWindowLoaded.then( win => {
			win.webContents.send( 'json' , {
				type : "ahk-cp-status" ,
				data : false ,
			} );
			
			IPCLogger( `'child_process-closed with code: ', ${ e }` );
		} );
		ahkSpawner_SetState( { ahk : null } );
		console.log( 'closed......................' );
	} );
	return ahk;
}

type MessageTypes =
//传输数据
	| "transfer"
	//停止ahk进程
	| "stop";


// import { IPCLogger } from '#reaxels/IPC-logger';
import { reaxel_ServerTime } from '#reaxels/server-time';
import { reaxel_ElectronENV } from '#reaxels/env';
import { reaxel_Logger } from '#reaxels/debuggers';
import { mainWindowLoaded } from '#project/src/Main/mainWindow-loaded-promise';
import { ipcRenderer , ipcMain , app } from 'electron';
import path , {} from 'path';
import process from 'node:process';
import cp , {} from 'node:child_process';
import purdy from 'purdy';
import chalk from 'chalk';
