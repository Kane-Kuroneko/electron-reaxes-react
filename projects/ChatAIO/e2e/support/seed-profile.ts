/**
 * 写入隔离 userData，让返回用户路径跳过 GuidingView。
 * 语言固定 en-US，托盘关闭，避免污染系统托盘。
 * 同时写入小型 user-ais.json（about:blank），deletedIds 钉死目录供应商，避免加载真实站点。
 * 设计：docs/features/e2e-playwright.md
 */

export const seedReturningUserProfile = async(
	userDataDir : string ,
	patchUserAis? : E2EUserAisPatch,
) => {
	await fs.mkdir( userDataDir , { recursive : true } );
	await seedUserAis( userDataDir , patchUserAis );
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

const seedUserAis = async(
	userDataDir : string ,
	patchUserAis? : E2EUserAisPatch,
) => {
	const catalogPath = path.resolve(
		path.dirname( fileURLToPath( import.meta.url ) ) ,
		'../../statics/ai-catalog/default-ais.json',
	);
	const catalogVendorIds = await readBundledCatalogVendorIds( catalogPath );
	const payload = buildE2EUserAisFile( catalogVendorIds );
	patchUserAis?.( payload );
	const userAisPath = path.join( userDataDir , 'user-ais.json' );
	await fs.writeFile(
		userAisPath ,
		`${ JSON.stringify( payload , null , '\t' ) }\n` ,
		'utf8',
	);
};

import {
	buildE2EUserAisFile ,
	readBundledCatalogVendorIds ,
	type E2EUserAisPatch,
} from './e2e-ais';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
