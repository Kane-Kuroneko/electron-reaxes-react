/**
 * 前后端共享一部分settings结构
 */
export const sharedSettingsStatus = {
	networks : {
		
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
				enabled : true ,
				proxy_conf : checkAs<NetworkProxy.ProxyConfFields>( {
					...createDefaultProxyConf(),
				} ) ,
			} ,
		} ,
		proxy_server_list : checkAs<NetworkProxy.ProxyServer.Server[]>( createDefaultProxyServers() ) ,
	}
}

export namespace Networks {
	
	export type UnionType = Direct | UseSystem | UserFill | FromServerList;
	
	export type Direct = {
		proxy_mode : 'direct',
	}
	
	export type UseSystem = {
		proxy_mode : 'use_system',
	}
	
	export type UserFill = {
		proxy_mode : 'user_fill',
		proxy_fields : NetworkProxy.GlobalProxy
	}
	
	export type FromServerList = {
		proxy_mode : 'from_server_list',
		using_proxy_server_id : NetworkProxy.ProxyServer.Server['proxy_server_id'],
		proxy_server_list:NetworkProxy.ProxyServer.Server[],
	}
}


export const reaxable_Settings = () => {
	
	return createReaxable( {
		//UI组件状态和临时数据
		UIControls : {
			networks : {
				proxy_mode : checkAs<NetworkProxy.GlobalProxyMode>( 'direct' ) ,
				using_proxy_server_id : checkAs<string>( null ) ,
				proxy_fields : checkAs<NotFalse<Settings.IpcSettings['proxy']> & { no_proxy_for__enabled: boolean; }>( {
					...createDefaultGlobalProxy() ,
					no_proxy_for : checkAs<NetworkProxy.NoProxyForItem[]>( [] ) ,
					//是否启用no_proxy_for字段,作用是仅禁用但不清空字段
					no_proxy_for__enabled : true ,
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
						enabled : true ,
						proxy_conf : checkAs<NetworkProxy.ProxyConfFields>( {
							...createDefaultProxyConf(),
						} ) ,
					} ,
				} ,
				proxy_server_list : checkAs<NetworkProxy.ProxyServer.Server[]>( createDefaultProxyServers() ) ,
			} ,
			manage_AIs : {
				AIs : checkAs<( {
					enabled: boolean,
				} & AI.AIItem )[]>( [] ) ,
				edit_AI_modal : {
					visible : false ,
					editing_id : null ,
					fields : checkAs<AI.EditAIItem>( {
						label : '' ,
						AI_family : checkAs<AI.AIFamily>( null ) ,
						url : '' ,
						desc : '' ,
						preloadOnStartup:false,
						proxy_mode : checkAs<NetworkProxy.AIProxyMode>( 'follow_global_setting' ) ,
						from_server_list_proxy : checkAs<string>( null ) ,
						user_fill_proxy : checkAs<NetworkProxy.ProxyConf>( null ) ,
					} ) ,
				} ,
			} ,
			appearance : {
				darkmode : false ,
				theme : checkAs<Appearance.Theme>( 'system' ) ,
				show_quickswitch_tag : true ,
				show_current_tag : true ,
				language : checkAs<Appearance.Language>( 'follow-system' ) ,
			} ,
			system : {
				gpu_acceleration : true ,
				show_tray : true ,
				close_to_tray : true ,
			} ,
			hotkeys : {} ,
		} ,
		//从后端请求的数据等,不用与控制视图
		Data : {
			// AI configurations are now loaded dynamically via IPC from AIConfigService
			AIs : checkAs<AI.AIItem[]>( [] ) ,
			settings : {
				global_proxy : checkAs<{
					enabled: boolean,
					address: string,
					type: string,
					port: number,
					hostname: string,
					no_proxy_for: NetworkProxy.NoProxyForItem[],
					proxy_auth: {
						enabled: boolean,
						username: string,
						password: string,
					},
				}>( null ) ,
			} ,
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
};

export type Menus = "general" | "net" | "mngeai" | "keys";



import { Settings } from '#src/Types/Settings';
import {
	createDefaultGlobalProxy ,
	createDefaultProxyConf ,
	createDefaultProxyServers,
} from '#src/shared/statics/default-proxy';
import { AI } from "#src/Types/SettingsTypes/AI";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
