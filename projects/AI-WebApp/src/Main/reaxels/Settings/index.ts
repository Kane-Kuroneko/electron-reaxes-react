import { Networks } from "#src/shared/structs/settings";


export const reaxel_Settings = reaxel(() => {
	
	const {setState,store,mutate} = createReaxable({
		networks : checkAs<Networks.UnionType & {
			
		}>({
			proxy_mode :  'user_fill' ,
			proxy_fields : checkAs<NotFalse<Settings.IpcSettings['proxy']> & { no_proxy_for__enabled: boolean; }>( {
				hostname : '127.0.0.1' ,
				port : 7897 ,
				protocol : 'http' ,
				no_proxy_for : checkAs<string[]>( [] ) ,
				//是否启用no_proxy_for字段,作用是仅禁用但不清空字段
				no_proxy_for__enabled : true ,
				proxy_auth : false ,
			} ) ,
			using_proxy_server_id: '',
			proxy_server_list :  [
				{
					proxy_server_id : '1' ,
					server_name : 'Clash Verge Rev' ,
					proxy_conf : checkAs<NetworkProxy.ProxyConfFields>( {
						protocol : 'http' ,
						hostname : '127.0.0.1' ,
						port : 7897 ,
						proxy_auth : false ,
					} ) ,
					enabled : true ,
				} ,
				{
					proxy_server_id : '2' ,
					server_name : 'Clash For Windows' ,
					proxy_conf : checkAs<NetworkProxy.ProxyConfFields>( {
						protocol : 'http' ,
						hostname : '127.0.0.1' ,
						port : 7890 ,
						proxy_auth : {
							username : 'kane' ,
							password : '123456' ,
						} ,
					} ) ,
					enabled : true ,
				} ,
			]  ,
		}) ,
	});
	
	rehancer_ipcReceive({store, setState, mutate})();
	
	useIpcRendererToMain('exit-settings').on(({event,reply}) => {
		Reaxel_View.setState({settingsViewOpened : false});
	});
	
	useIpcRpc('submit-settings').handle(async ({event},settings) => {
		
		return { success : true };
	});
	
	useIpcRpc( 'fetch-settings' ).handle( async( { event }  ) => {
		return {} as any;
	} );
	
	const rtn = {}
	
	return Object.assign(() => rtn , {
		store,setState,mutate
	})
})

export type Reaxel_Settings = typeof reaxel_Settings;

import {
	useIpcMainToRenderer ,
	useIpcRpc ,
	useIpcRendererToMain,
} from '#main/services/ipc';
import { reaxel , createReaxable , obsReaction , collectDeps , distinctCallback } from 'reaxes';
import { Reaxel_View } from "#main/reaxels/Views";
import { rehancer_ipcReceive } from './rehancer_ipcReceive';
type Menus = "net" | "appearance" | "mngeai" | "sys" | "keys";
type NotFalse<T> = Exclude<T , false | null | undefined>;
type NotNull<T> = Exclude<T , null | undefined>;


import { Settings } from '#src/Types/Settings';
import { AI } from "#src/Types/SettingsTypes/AI";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
