const SETTINGS_CONFIG_FILE = 'user-settings.json';
const SETTINGS_CONFIG_VERSION = '1.0.0';

type RuntimeSettings = Omit<Settings , 'AIs'>;

export type SettingsConfigFile = {
	version: string;
	settings: RuntimeSettings;
};

const cloneData = <T>(data:T):T => JSON.parse( JSON.stringify( data ) );

export const createDefaultProxyConf = sharedCreateDefaultProxyConf;
export const createDefaultGlobalProxy = sharedCreateDefaultGlobalProxy;
export const createDefaultProxyServers = sharedCreateDefaultProxyServers;

export const createDefaultRuntimeSettings = ():RuntimeSettings => ( {
	networks : {
		global_proxy : {
			proxy_mode : 'direct' ,
			proxy_server_id : null ,
			user_fill_proxy : createDefaultGlobalProxy(),
		} ,
		proxy_server_list : createDefaultProxyServers(),
	} ,
	system : {
		gpu_acceleration : true ,
		show_tray : true ,
		close_to_tray : true,
	} ,
	startup : {
		aiPageLoadMode : 'last-used-ai',
	} ,
	appearance : {
		darkmode : false ,
		theme : 'system' ,
		language : 'follow-system',
	},
} );

export const normalizeProxyConf = (proxyConf?:NetworkProxy.ProxyConf):NetworkProxy.ProxyConfFields => {
	if( !proxyConf ) {
		return createDefaultProxyConf();
	}
	return {
		...createDefaultProxyConf() ,
		...proxyConf ,
		port : Number( proxyConf.port ) || createDefaultProxyConf().port ,
		proxy_auth : proxyConf.proxy_auth || false,
	};
};

export const normalizeGlobalProxy = (proxyConf?:NetworkProxy.GlobalProxy):NetworkProxy.GlobalProxyFields => {
	const defaults = createDefaultGlobalProxy();
	if( !proxyConf ) {
		return defaults;
	}
	return {
		...defaults ,
		...normalizeProxyConf( proxyConf ) ,
		no_proxy_for : Array.isArray( proxyConf.no_proxy_for ) ? proxyConf.no_proxy_for : [] ,
		no_proxy_for__enabled : proxyConf.no_proxy_for__enabled !== false,
	};
};

export const normalizeRuntimeSettings = (settings?:Partial<RuntimeSettings>):RuntimeSettings => {
	const defaults = createDefaultRuntimeSettings();
	const networks = settings?.networks;
	const globalProxy = networks?.global_proxy;
	const appearance = settings?.appearance;
	const theme = normalizeThemePreference( appearance?.theme , appearance?.darkmode );
	
	return {
		networks : {
			global_proxy : {
				...defaults.networks.global_proxy ,
				...globalProxy ,
				proxy_mode : globalProxy?.proxy_mode || defaults.networks.global_proxy.proxy_mode ,
				user_fill_proxy : normalizeGlobalProxy( globalProxy?.user_fill_proxy ),
			} ,
			proxy_server_list : Array.isArray( networks?.proxy_server_list )
				? networks.proxy_server_list.map( server => ( {
					...server ,
					proxy_conf : normalizeProxyConf( server.proxy_conf ) ,
					enabled : server.enabled !== false,
				} ) )
				: defaults.networks.proxy_server_list,
		} ,
		system : {
			...defaults.system ,
			...settings?.system,
		} ,
		startup : {
			...defaults.startup ,
			...settings?.startup ,
			aiPageLoadMode : normalizeStartupAIPageLoadMode( settings?.startup?.aiPageLoadMode ),
		} ,
		appearance : {
			...defaults.appearance ,
			...appearance ,
			theme ,
			darkmode : theme === 'dark' ,
			language : normalizeLanguagePreference( appearance?.language ?? defaults.appearance.language ),
		},
	};
};

export const normalizeStartupAIPageLoadMode = (mode?:string):RuntimeSettings['startup']['aiPageLoadMode'] => {
	return mode === 'first-ai' ? 'first-ai' : 'last-used-ai';
};

class SettingsConfigService {
	private userConfigPath:string;
	
	constructor() {
		this.userConfigPath = path.join( app.getPath( 'userData' ) , SETTINGS_CONFIG_FILE );
	}
	
	getDefaultSettings():RuntimeSettings {
		return cloneData( createDefaultRuntimeSettings() );
	}
	
	getUserSettings():RuntimeSettings | null {
		try {
			if( !fs.existsSync( this.userConfigPath ) ) {
				return null;
			}
			const content = fs.readFileSync( this.userConfigPath , 'utf-8' );
			const parsed = JSON.parse( content ) as SettingsConfigFile;
			return normalizeRuntimeSettings( parsed.settings );
		} catch ( error ) {
			console.error( '[SettingsConfigService] Failed to read user settings:' , error );
			return null;
		}
	}
	
	getEffectiveSettings():RuntimeSettings {
		return this.getUserSettings() || this.getDefaultSettings();
	}
	
	saveSettings( settings:RuntimeSettings ):void {
		const normalizedSettings = normalizeRuntimeSettings( settings );
		const settingsFile:SettingsConfigFile = {
			version : SETTINGS_CONFIG_VERSION ,
			settings : normalizedSettings,
		};
		const dir = path.dirname( this.userConfigPath );
		if( !fs.existsSync( dir ) ) {
			fs.mkdirSync( dir , { recursive : true } );
		}
		fs.writeFileSync( this.userConfigPath , JSON.stringify( settingsFile , null , 2 ) , 'utf-8' );
	}
	
	hasUserModifications():boolean {
		return fs.existsSync( this.userConfigPath );
	}
}

let instance:SettingsConfigService | null = null;

export function getSettingsConfigService():SettingsConfigService {
	if( !instance ) {
		instance = new SettingsConfigService();
	}
	return instance;
}

export default SettingsConfigService;

import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import {
	normalizeLanguagePreference ,
	normalizeThemePreference,
} from '#src/shared/appearance';
import {
	createDefaultGlobalProxy as sharedCreateDefaultGlobalProxy ,
	createDefaultProxyConf as sharedCreateDefaultProxyConf ,
	createDefaultProxyServers as sharedCreateDefaultProxyServers,
} from '#src/shared/statics/default-proxy';
import type { Settings } from '#src/Types/SettingsTypes';
import { NetworkProxy } from '#src/Types/SettingsTypes/NetworkProxy';
