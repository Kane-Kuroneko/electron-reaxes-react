import { Reaxel_View } from "#main/reaxels/Views";

export const reaxel_Settings = reaxel(() => {
	
	const {setState,store,mutate} = createReaxable({
		globalProxy : 'http://127.0.0.1:7897',
	});
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


import { reaxel , createReaxable , obsReaction , collectDeps , distinctCallback } from 'reaxes';
import {ipcMain} from 'electron';
