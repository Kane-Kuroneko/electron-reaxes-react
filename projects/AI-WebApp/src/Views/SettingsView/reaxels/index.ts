export const reaxel_SettingsView = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		//UI组件状态和临时数据
		UIControls : {
			is_getting_settings : false,
			global_proxy : {
				enabled : true,
				
				address : '',
				type : 'http',
				port : 8080,
				hostname : '',
				no_proxy_for: [],
				
				proxy_auth : {
					enabled : false,
					username : '',
					password : '',
				},
				
				check_connection:{
					modal_visible : false,
					address : '',
					pending : false,
					success : false,
					error : '',
				},
			},
			AIs : checkAs<({
				enabled : boolean,
			}&AIItem)[]>([]),
		},
		//从后端请求的数据等,不用与控制视图
		Data:{
			AIs:checkAs<AIItem[]>([]),
			settings : {
				global_proxy : checkAs<{
					enabled : boolean,
					address : string,
					type : string,
					port : number,
					hostname : string,
					no_proxy_for: string[],
					proxy_auth : {
						enabled : boolean,
						username : string,
						password : string,
					},
				}>(null)
			}
		},
		
	} );
	
	async function getSettings(){
		const {
			proxy,
		} = await api.getSettings();
		
		
	}
	async function setSettings(settings){
		if(!settings){
			settings = await getSettings();
		}
		mutate(({Data,UIControls}) => {
			
		});
	}
	
	const rtn = {
		getSettings,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
})

import {
	AIName ,
	AIItem,
} from "#src/Types/AI";
