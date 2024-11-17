

export const reaxel_ProcessMonitor = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = orzMobx( {
		monitorEnabled : false ,
	} );
	
	const pollingIsWar3Running = function () {
		let interval;
		return async() => {
			const { monitorEnabled } = store;
			const {ahkSpawner_Store,spawn,shutdown} = reaxel_AhkSpawner();
			//如果开启监听进程
			if(monitorEnabled){
				if(interval){
					clearInterval(interval);
				}
				interval = setInterval( async () => {
					const war3Running = (await psList()).some(ps => ps.name === 'Warcraft III.exe');
					if(!war3Running && ahkSpawner_Store.ahk){
						shutdown();
					}else if(war3Running && !ahkSpawner_Store.ahk) {
						spawn();
					}
				} , 200 );
			}else if(interval) {
				clearInterval(interval);
				interval = null;
			}
		}
	}();
	
	obsReaction((first) => {
		if (first) return;
		pollingIsWar3Running();
	},() => [store.monitorEnabled]);
	
	let ret = {
		toggleWar3ProcessMonitor(directive ){
			setState( {
				monitorEnabled : {
					'start' : true ,
					'stop' : false ,
				}[directive],
			} );
		}
	};
	
	return () => {
		
		return ret;
	};
} );
import { reaxel_AhkSpawner } from '#reaxels/ahk-spawner';
import {} from 'electron';
import psList from 'ps-list';
