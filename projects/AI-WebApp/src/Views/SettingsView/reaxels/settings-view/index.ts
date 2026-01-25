export const reaxel_SettingsView = reaxel( () => {
	// const electronStore = new ElectronStore<{
	// 	settings: AI,
	// }>( { name : "previously-used-ai" } );
	const {
		store ,
		setState ,
		mutate ,
	} = createReaxable( {
		RootMenu : {
			current : checkAs<Menus>('net') ,
			menus : [
				{
					label : 'Networks' ,
					value : checkAs<Menus>('net') ,
				} ,
				{
					label : 'Appearance(delay for now)' ,
					value : checkAs<Menus>('appearance') ,
				} ,
				{
					label : 'Manage AIs' ,
					value : checkAs<Menus>('mngeai') ,
				} ,
				{
					label : 'System' ,
					value : checkAs<Menus>('sys') ,
				} ,
				// {
				// 	label : 'Hotkeys' ,
				// 	value : 'keys' ,
				// },
			] ,
		} ,
		//UI组件状态和临时数据
		UIControls : {
			networks : {
				proxy_mode : checkAs<'direct' | 'use_system' | 'user_fill' | 'from_proxy_server'>( 'user_fill' ) ,
				proxy_fields : checkAs<NotFalse<Settings.IpcSettings['proxy']> & { no_proxy_for__enabled: boolean; }>( {
					hostname : '127.0.0.1' ,
					port : 7897 ,
					protocol : 'http' ,
					no_proxy_for : checkAs<string[]>( [] ) ,
					//是否启用no_proxy_for字段,作用是仅禁用但不清空字段
					no_proxy_for__enabled : true ,
					proxy_auth : false ,
				} ) ,
				check_connection : {
					modal_visible : false ,
					address : '' ,
					pending : false ,
					success : false ,
					error : null ,
				} ,
				
				edit_proxy_server_modal : {
					visible : false ,
					mode : checkAs<"edit" | "add">( 'edit' ) ,
					editing_id : null ,
					fields : {
						server_name : '' ,
						proxy_conf : checkAs<NetworkProxy.ProxyConfFields>( {
							protocol : 'http' ,
							hostname : '127.0.0.1' ,
							port : 7897 ,
							proxy_auth : false ,
						} ) ,
					} ,
				} ,
				proxy_server_list : checkAs<NetworkProxy.ProxyServer.Server[]>( [
					{
						proxy_server_id : '1' ,
						server_name : 'Clash Verge Rev' ,
						proxy_conf : checkAs<NetworkProxy.ProxyConfFields>( {
							protocol : 'http' ,
							hostname : '127.0.0.1' ,
							port : 7897 ,
							proxy_auth : false ,
						} ) ,
						enabled:true,
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
						enabled:true,
					} ,
				] ) ,
			} ,
			manage_AIs : {
				AIs : checkAs<( {
					enabled: boolean,
				} & AI.AIItem )[]>( [] ),
				edit_AI_modal : {
					visible : false ,
					editing_id : null,
					fields : checkAs<AI.EditAIItem>( {
						label : '' ,
						AI_family : checkAs<AI.AIFamily>( null ) ,
						url : '' ,
						desc : '' ,
						proxy_mode : checkAs<"direct" | "follow_global_setting" | "from_server_list" | "user_fill">( 'follow_global_setting' ) ,
						from_server_list_proxy : checkAs<string>( null ) ,
						user_fill_proxy : checkAs<NetworkProxy.ProxyConf>( null ) ,
					} ),
				},
			} ,
			appearance : {
				darkmode : false ,
				show_quickswitch_tag : true ,
				show_current_tag : true ,
				language : checkAs<Appearance.Language>('en-US'),
			} ,
			system : {
				gpu_acceleration : true ,
				tray : true ,
			} ,
			hotkeys : {},
		} ,
		//从后端请求的数据等,不用与控制视图
		Data : {
			AIs : checkAs<AI.AIItem[]>( [
				{
					label : "ChatGPT" as const,
					id : '335f54fe-e09c-44e5-a168-783c7a3d5d1f',
					disabled:false,
					AI_family : checkAs<AI.AIFamily>('chatgpt'),
					url : "https://chatgpt.com",
					proxy_mode : 'user_fill',
					from_server_list_proxy:null,
					user_fill_proxy :{
						hostname : '127.0.0.1',
						port : 7897,
						protocol : 'http',
						proxy_auth : false
					}
				},
				{
					label : "Grok" as const,
					id : 'f51ff516-99ea-44be-9967-cb86be37a4ad',
					disabled : false,
					AI_family : checkAs<AI.AIFamily>('grok'),
					url : "https://grok.com",
					proxy_mode : 'user_fill',
					from_server_list_proxy:null,
					user_fill_proxy :{
						hostname : '127.0.0.1',
						port : 7897,
						protocol : 'http',
						proxy_auth : false
					}
				},
			] ) ,
			settings : {
				global_proxy : checkAs<{
					enabled: boolean,
					address: string,
					type: string,
					port: number,
					hostname: string,
					no_proxy_for: string[],
					proxy_auth: {
						enabled: boolean,
						username: string,
						password: string,
					},
				}>( null ),
			},
		} ,
		
		get_settings_status : {
			pending : false ,
			error : false ,
		} ,
		submit_settings_status : {
			pending : false ,
			error : false ,
		} ,
	} );
	
	
	rehancer_Dev({store,setState,mutate})();
	async function getSettings() {
		const settings = await api.getSettings();
		
		return settings;
	}
	
	async function setSettings( settings ) {
		if( !settings ) {
			settings = await getSettings();
		}
		mutate( ( {
			Data ,
			UIControls,
		} ) => {
			
		} );
	}
	
	const rtn = {
		getSettings ,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );

type Menus = "net"|"appearance"|"mngeai"|"sys"|"keys";

export type Reaxel_SettingsView = Pick<typeof reaxel_SettingsView , "mutate"|"store"|"setState">;

type NotFalse<T> = Exclude<T , false|null|undefined>;

type NotNull<T> = Exclude<T , null|undefined>;
import {
	AI ,
} from "#src/Types/SettingsTypes/AI";

import { rehancer_Dev } from './rehancer_Dev';
import { Settings, } from '#src/Types/Settings'
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
