import { Reaxel_View } from "#main/reaxels/Views";
import { rehancer_ipcReceive } from './rehancer_ipcReceive';

export const reaxel_Settings = reaxel(() => {
	
	const {setState,store,mutate} = createReaxable({
		globalProxy : 'http://127.0.0.1:7897',
	});
	
	// 应用 IPC 接收增强器
	rehancer_ipcReceive({store, setState, mutate})();
	
	ipcMain.on('exit-settings',async () => {
		Reaxel_View.setState({settingsViewOpened : false});
	});
	ipcMain.handle('settings-update' , () => {
		
	});
	ipcMain.handle('get-settings' , (event) => {
		return {
			proxy : store.globalProxy
		}
	});
	
	const rtn = {}
	
	return Object.assign(() => rtn , {
		store,setState,mutate
	})
})

export type Reaxel_Settings = typeof reaxel_Settings;

import { reaxel , createReaxable , obsReaction , collectDeps , distinctCallback } from 'reaxes';
import {ipcMain} from 'electron';
import {} from ''
