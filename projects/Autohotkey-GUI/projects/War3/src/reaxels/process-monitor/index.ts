const { absAppRunningPath , absAppStaticsPath } = reaxel_ElectronENV();

export const reaxel_ProcessMonitor = reaxel( () => {
	const {
		store ,
		setState ,
		mutate ,
	} = orzMobx( {
		monitorEnabled : false ,
	} );
	
	try {
		process.env.PS_LIST_BINARY_PATH = path.join( absAppStaticsPath , 'assets/ps-list/vendor' , `fastlist-0.3.0-${ {
			'x64' : 'x64' ,
			'ia32' : 'x86',
		}[arch] }.exe` );
	} catch ( e ) {
		IPCLogger( `process.env.PS_LIST_BINARY_PATH :${ e }` );
	}
	
	const pollingIsWar3Running = function () {
		let interval;
		
		const [detectPSListSuccess,resetDeps] = contrastedCallback( () => {
			IPCLogger( 'ps-list启动成功' );
		} , () => [interval] );
		
		return async() => {
			const { monitorEnabled } = store;
			const { ahkSpawner_Store , spawn , shutdown } = reaxel_AhkSpawner();
			//如果开启监听进程
			if( monitorEnabled ) {
				if( interval ) {
					clearInterval( interval );
				}
				interval = setInterval( async() => {
					const war3Running = (
						await psList()
					).some( ps => ps.name === 'Warcraft III.exe' );
					
					detectPSListSuccess( () => [ interval ] )();
					
					if( !war3Running && ahkSpawner_Store.ahk ) {
						shutdown();
					} else if( war3Running && !ahkSpawner_Store.ahk ) {
						spawn();
					}
				} , 500 );
			} else if( interval ) {
				clearInterval( interval );
				interval = null;
			} else {
				
			}
		};
	}();
	
	
	obsReaction( ( first ) => {
		if( first ) return;
		pollingIsWar3Running();
	} , () => [ store.monitorEnabled ] );
	
	let ret = {
		toggleWar3ProcessMonitor( directive ) {
			console.log( directive );
			setState( {
				monitorEnabled : {
					'start' : true ,
					'stop' : false ,
				}[directive] ,
			} );
		},
	};
	
	return () => {
		
		return ret;
	};
} );


import { reaxel_ElectronENV } from '#reaxels/env';
import { reaxel_AhkSpawner } from '#reaxels/ahk-spawner';
import path from 'path';
import { arch } from 'process';
import psList from './ps-list';
