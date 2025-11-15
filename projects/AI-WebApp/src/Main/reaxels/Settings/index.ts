export const reaxel_Settings = reaxel(() => {
	
	const {setState,store,mutate} = createReaxable({
		globalProxy : 'http://127.0.0.1:7897',
	});
	
	ipcMain.handle('settings-update' , () => {
		
	});
	ipcMain.handle('get-settings' , (event) => {
		return {
			proxy : ''
		}
	});
})


import { reaxel , createReaxable , obsReaction , collectDeps , distinctCallback } from 'reaxes';
import {ipcMain} from 'electron';
