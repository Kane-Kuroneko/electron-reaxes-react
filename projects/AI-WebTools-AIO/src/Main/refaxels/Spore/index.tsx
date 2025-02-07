let spore_id = 0;
const { absAppRunningPath } = reaxel_ElectronENV();
export const Refaxel_Spore = (options:Options) => {
	
	return reaxel(() => {
		const { store , setState , mutate } = orzMobx( {
			spore_id : ++spore_id ,
			wcv : null as WebContentsView ,
			conf : options.conf ,
			get controller() {
				return {
					spore_id : this.spore_id ,
				};
			} ,
		} );
		const instantiate:(opts:{position:Postion}) => Promise<WebContentsView> = async ({position,}) => {
			const wcv = new WebContentsView( {
				webPreferences : {
					devTools : true ,
					contextIsolation : true ,
					nodeIntegration : false,
					preload : path.join(absAppRunningPath,'./preload.js') ,
					experimentalFeatures : false ,
				} ,
			} );
			useSetProxy( wcv , options.conf.proxy );
			
			wcv.webContents.loadURL( options.conf.url );
			if(options.onWcvMounted){
				wcv.webContents.on( 'did-finish-load' , () => {
					options.onWcvMounted( wcv );
					if(options.executeScripts){
						options.executeScripts( store.controller ).forEach( ( script ) => {
							wcv.webContents.executeJavaScript( script );
						} );
					}
				} );
			}
			return wcv;
		} 
		const devastate = () => {
			if(!store.wcv){
				throw new Error( `该wcv未被挂载.name:${ store.conf.name }` );
			}
			debugger;console.log('未实现的api');
			// store.wcv.webContents.des
		}
		const setBounds = () => {
			if(store.wcv){
				throw new Error( `在setBounds之前需要先初始化wcv! name:${ store.conf.name }` );
			}
			return store.wcv.setBounds
		};
		const rtn = {
			store,
			setState,
			mutate,
			instantiate,
			devastate,
			
		};
		return () => rtn;
	})
}
const useSetProxy = (wcv:WebContentsView,proxy:Conf['proxy']) => {
	if(!proxy){
		return;
	}
	wcv.webContents.session.setProxy( {
		proxyRules : function () {
			if(_.isString(proxy)){
				return `http=${proxy};https=${proxy}`
			}else {
				let rtn = ``;
				if( proxy.http ) {
					rtn += `http=${ proxy.http };`;
				}
				if( proxy.https ) {
					rtn += `https=${ proxy.https }`;
				}
				return rtn;
			}
		}(),
	} );
}
type Options = {
	conf : Conf;
	executeScripts : (controller:SporeController) => string[];
	onWcvMounted? : (wcv:WebContentsView) => void;
	onWcvCreated? : (wcv:WebContentsView) => Promise<void>
}
type Conf = {
	name : string;
	url : string;
	proxy : {
		http:string;
		https:string;
	}|string;
	
}
export type Postion = "auto"|"left"|"right"|"top"|"bottom"|"leftTop"|"leftBottom"|"rightTop"|"rightBottom";
export type SporeController = {
	spore_id : number,
};
import path from 'path';
import { reaxel_ElectronENV } from '#generic/reaxels/runtime-paths';
import type {BrowserWindow} from 'electron';
import {WebContentsView} from 'electron';
