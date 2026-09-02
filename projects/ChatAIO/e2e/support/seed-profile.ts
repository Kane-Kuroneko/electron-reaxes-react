/**
 * 写入隔离 userData，让返回用户路径跳过 GuidingView。
 * 语言固定 en-US，托盘关闭，避免污染系统托盘。
 */

export const seedReturningUserProfile = async( userDataDir:string ) => {
	await fs.mkdir( userDataDir , { recursive : true } );
	const settingsPath = path.join( userDataDir , 'user-settings.json' );
	const payload = {
		version : '1.0.0' ,
		settings : {
			networks : {
				global_proxy : {
					proxy_mode : 'direct' ,
					proxy_server_id : null ,
					user_fill_proxy : {
						protocol : 'http' ,
						hostname : '127.0.0.1' ,
						port : 7890 ,
						proxy_auth : false ,
						no_proxy_for : [] ,
						no_proxy_for__enabled : true,
					},
				} ,
				proxy_server_list : [] ,
				proxy_test_urls : {
					foreign : 'https://api.ipify.org?format=json' ,
					domestic : 'https://myip.ipip.net',
				},
			} ,
			system : {
				gpu_acceleration : true ,
				show_tray : false ,
				close_to_tray : false,
			} ,
			startup : {
				aiPageLoadMode : 'last-used-ai',
			} ,
			appearance : {
				darkmode : false ,
				theme : 'light' ,
				language : 'en-US',
			},
		},
	};
	await fs.writeFile( settingsPath , `${ JSON.stringify( payload , null , '\t' ) }\n` , 'utf8' );
};

import fs from 'node:fs/promises';
import path from 'node:path';
