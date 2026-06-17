/**
 * AI Configuration Service
 * 管理源码内置默认 AI 配置和用户覆盖配置。
 */

const USER_AI_CONFIG_FILE = 'user-ais.json';

export interface AIConfigFile {
	version: string;
	description?: string;
	ais: AI.AIItem[];
	deletedIds?: string[];
}

const AI_FAMILY_DEFAULT_URLS:Record<AI.AIFamily , string> = {
	chatgpt : 'https://chatgpt.com' ,
	grok : 'https://grok.com' ,
	gemini : 'https://gemini.google.com' ,
	deepseek : 'https://chat.deepseek.com' ,
	perplexity : 'https://www.perplexity.ai' ,
	claude : 'https://claude.ai' ,
	custom : '' ,
	'dev-proxy-test' : 'https://whatismyipaddress.com/' ,
	doubao : 'https://www.doubao.com' ,
	qianwen : 'https://www.qianwen.com/' ,
	kimi : 'https://kimi.moonshot.cn',
};

const normalizeAIFamily = (ai:AI.AIItem):AI.AIFamily => {
	const family = ai.AI_family;
	if( family && Object.prototype.hasOwnProperty.call( AI_FAMILY_DEFAULT_URLS , family ) ) {
		const defaultUrl = AI_FAMILY_DEFAULT_URLS[family];
		if( family !== 'custom' && ai.id?.startsWith( 'custom-' ) && ai.url && ai.url !== defaultUrl ) {
			return 'custom';
		}
		return family;
	}
	return 'custom';
};

const normalizeAI = (ai:AI.AIItem):AI.AIItem => {
	const family = normalizeAIFamily( ai );
	return {
		...ai ,
		label : ai.label || ( family === 'custom' ? 'Custom AI' : family ) ,
		AI_family : family ,
		url : ai.url || AI_FAMILY_DEFAULT_URLS[family] ,
		disabled : ai.disabled === true ,
		url_override : family === 'custom' ? null : ai.url_override || null ,
		proxy_mode : ai.proxy_mode || 'follow_global_setting' ,
		from_server_list_proxy : ai.from_server_list_proxy || null ,
		user_fill_proxy : ai.user_fill_proxy || null ,
		preloadOnStartup : ai.preloadOnStartup === true,
	};
};

class AIConfigService {
	private userConfigPath:string;
	private defaultConfig:AIConfigFile;
	
	constructor() {
		this.defaultConfig = defaultAIsData as AIConfigFile;
		this.userConfigPath = path.join( app.getPath( 'userData' ) , USER_AI_CONFIG_FILE );
	}
	
	getDefaultAIs():AI.AIItem[] {
		return cloneObservableToPlain( this.defaultConfig.ais ).map( normalizeAI );
	}
	
	getUserConfig():AIConfigFile | null {
		try {
			if( !fs.existsSync( this.userConfigPath ) ) {
				return null;
			}
			const content = fs.readFileSync( this.userConfigPath , 'utf-8' );
			const userConfig = JSON.parse( content ) as AIConfigFile;
			return {
				version : userConfig.version || this.defaultConfig.version ,
				ais : Array.isArray( userConfig.ais ) ? userConfig.ais.map( normalizeAI ) : [] ,
				deletedIds : Array.isArray( userConfig.deletedIds ) ? userConfig.deletedIds : [],
			};
		} catch ( error ) {
			console.error( '[AIConfigService] Failed to read user config:' , error );
			return null;
		}
	}
	
	getUserAIs():AI.AIItem[] | null {
		return this.getUserConfig()?.ais ?? null;
	}
	
	saveUserConfig( userConfig:AIConfigFile ):void {
		try {
			const dir = path.dirname( this.userConfigPath );
			if( !fs.existsSync( dir ) ) {
				fs.mkdirSync( dir , { recursive : true } );
			}
			fs.writeFileSync(
				this.userConfigPath ,
				JSON.stringify( {
					version : this.defaultConfig.version ,
					ais : userConfig.ais.map( normalizeAI ) ,
					deletedIds : userConfig.deletedIds || [],
				} , null , 2 ) ,
				'utf-8',
			);
		} catch ( error ) {
			console.error( '[AIConfigService] Failed to save user config:' , error );
			throw error;
		}
	}
	
	saveUserAIs( ais:AI.AIItem[] , deletedIds?:string[] ):void {
		const currentConfig = this.getUserConfig();
		this.saveUserConfig( {
			version : this.defaultConfig.version ,
			ais ,
			deletedIds : deletedIds ?? currentConfig?.deletedIds ?? [],
		} );
	}
	
	replaceAllAIs( ais:AI.AIItem[] ):void {
		const nextIds = new Set( ais.map( ai => ai.id ) );
		const deletedIds = this.getDefaultAIs()
			.filter( ai => !nextIds.has( ai.id ) )
			.map( ai => ai.id );
		this.saveUserAIs( ais , deletedIds );
	}
	
	getEffectiveAIs():AI.AIItem[] {
		const userConfig = this.getUserConfig();
		if( !userConfig ) {
			return this.getDefaultAIs();
		}
		
		const defaultAIs = this.getDefaultAIs();
		const userAIIds = new Set( userConfig.ais.map( ai => ai.id ) );
		const deletedIds = new Set( userConfig.deletedIds || [] );
		const effectiveAIs = [ ...userConfig.ais ];
		
		defaultAIs.forEach( defaultAI => {
			if( !userAIIds.has( defaultAI.id ) && !deletedIds.has( defaultAI.id ) ) {
				effectiveAIs.push( defaultAI );
			}
		} );
		
		return effectiveAIs.map( normalizeAI );
	}
	
	resetToDefaults():void {
		try {
			if( fs.existsSync( this.userConfigPath ) ) {
				fs.unlinkSync( this.userConfigPath );
			}
		} catch ( error ) {
			console.error( '[AIConfigService] Failed to reset user config:' , error );
			throw error;
		}
	}
	
	hasUserModifications():boolean {
		return fs.existsSync( this.userConfigPath );
	}
	
	getAIById( id:string ):AI.AIItem | undefined {
		return this.getEffectiveAIs().find( ai => ai.id === id );
	}
	
	updateAI( id:string , updates:Partial<AI.AIItem> ):AI.AIItem | null {
		const effectiveAIs = this.getEffectiveAIs();
		const index = effectiveAIs.findIndex( ai => ai.id === id );
		
		if( index === -1 ) {
			console.warn( '[AIConfigService] AI not found:' , id );
			return null;
		}
		
		effectiveAIs[index] = normalizeAI( {
			...effectiveAIs[index] ,
			...updates ,
			id,
		} );
		
		this.replaceAllAIs( effectiveAIs );
		return effectiveAIs[index];
	}
	
	addAI( ai:Omit<AI.AIItem , 'id'> & { id?: string } ):AI.AIItem {
		const effectiveAIs = this.getEffectiveAIs();
		const newAI = normalizeAI( {
			...ai ,
			id : ai.id || this.generateUniqueId(),
		} as AI.AIItem );
		
		effectiveAIs.push( newAI );
		this.replaceAllAIs( effectiveAIs );
		
		return newAI;
	}
	
	deleteAI( id:string ):boolean {
		const effectiveAIs = this.getEffectiveAIs();
		const filteredAIs = effectiveAIs.filter( ai => ai.id !== id );
		
		if( filteredAIs.length === effectiveAIs.length ) {
			console.warn( '[AIConfigService] AI not found for deletion:' , id );
			return false;
		}
		
		this.replaceAllAIs( filteredAIs );
		return true;
	}
	
	private generateUniqueId():string {
		return `ai-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 , 11 ) }`;
	}
	
	/**
	 * 返回需要启动预加载的 AI 实例 ID 列表（替代旧版 family 粒度 API）。
	 * Family 粒度无法区分同 family 多实例，详情见 fixme.md P2-03。
	 */
	getPreloadAIIds():string[] {
		return this.getEffectiveAIs()
			.filter( ai => !ai.disabled && ai.preloadOnStartup )
			.map( ai => ai.id );
	}

	/** @deprecated 使用 getPreloadAIIds() 替代，原因见 fixme.md P2-03 */
	getPreloadAIFamilies():AI.AIFamily[] {
		const preloadFamilies = new Set<AI.AIFamily>();

		this.getEffectiveAIs().forEach( ai => {
			if( !ai.disabled && ai.preloadOnStartup ) {
				preloadFamilies.add( ai.AI_family );
			}
		} );

		return Array.from( preloadFamilies );
	}
}

let instance:AIConfigService | null = null;

export function getAIConfigService():AIConfigService {
	if( !instance ) {
		instance = new AIConfigService();
	}
	return instance;
}

export default AIConfigService;

import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import defaultAIsData from '#src/shared/statics/default-ais.json';
import { cloneObservableToPlain } from '#src/shared/utils/clone-for-ipc.utility';
import { AI } from '#src/Types/SettingsTypes/AI';
