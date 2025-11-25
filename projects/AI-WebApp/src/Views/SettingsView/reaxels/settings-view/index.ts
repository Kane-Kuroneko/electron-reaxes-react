export const reaxel_SettingsView = reaxel( () => {
	
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
					value : checkAs<Menus>(
						'net'
					) ,
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
			global_proxy : {
				enabled : true ,
				
				address : '' ,
				type : checkAs<'http'|'https'>('http') ,
				port : 8080 ,
				hostname : '' ,
				no_proxy_for : [] ,
				
				proxy_auth : {
					enabled : false ,
					username : '' ,
					password : '' ,
				} ,
				
				check_connection : {
					modal_visible : false ,
					address : '' ,
					pending : false ,
					success : false ,
					error : '' ,
				} ,
				no_proxy_for_enabled : true ,
			} ,
			AIs : checkAs<( {
				enabled: boolean,
			} & AIItem )[]>( [] ) ,
			appearance : {
				darkmode : false ,
				show_quickswitch_tag : true ,
				show_current_tag : true ,
			} ,
			system : {
				gpu_acceleration : true ,
				tray : true ,
			} ,
			hotkeys : {},
		} ,
		//从后端请求的数据等,不用与控制视图
		Data : {
			AIs : checkAs<AIItem[]>( [] ) ,
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
	
	
	rehancer_Dev({ store,setState,mutate})();
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

import type {
	AIName ,
	AIItem,
} from "#src/Types/AI";
import { rehancer_Dev } from './rehancer_Dev';
