export const reaxel_AIViews = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		AIViews : checkAs<RuntimeAIView[]>( [] ),
	} );
	
	const initAIView = async( ai:AI.AIItem , settings:Settings ) => {
		let runtimeView = store.AIViews.find( item => item.id === ai.id );
		if( runtimeView?.view ) {
			await updateRuntimeAIView( runtimeView , ai , settings );
			return runtimeView.view;
		}
		
		const view = initWebContentsView( {
			type : 'AI-View' ,
			domain : ai.url || getAIDomainByFamily( ai.AI_family ) ,
			aiConfig : ai ,
			settings ,
			webPreferences : {
				partition : getAIPartition( ai.id ),
			},
		} );
		
		mutate( s => {
			s.AIViews.push( {
				id : ai.id ,
				label : ai.label ,
				AIName : ai.AI_family ,
				view ,
				domain : ai.url || getAIDomainByFamily( ai.AI_family ) ,
				partition : getAIPartition( ai.id ) ,
				config : ai ,
				proxyKey : '',
			} );
		} );
		
		return view;
	};
	
	const destroyAIView = (id:string) => {
		const runtimeView = store.AIViews.find( item => item.id === id );
		if( !runtimeView?.view ) {
			return;
		}
		try {
			mainWindow.contentView.removeChildView( runtimeView.view );
			runtimeView.view.webContents.close();
		} catch ( error ) {
			console.warn( '[AIViews] Failed to destroy AI view:' , id , error );
		}
		mutate( s => {
			s.AIViews = s.AIViews.filter( item => item.id !== id );
		} );
	};
	
	const syncAIViewsWithConfig = async( settings:Settings ) => {
		const activeAIs = settings.AIs.filter( ai => !ai.disabled );
		const activeIds = new Set( activeAIs.map( ai => ai.id ) );
		
		store.AIViews.slice().forEach( runtimeView => {
			if( !activeIds.has( runtimeView.id ) ) {
				destroyAIView( runtimeView.id );
			}
		} );
		
		const currentAI = resolveCurrentAI( settings );
		if( currentAI && Reaxel_View.store.currentAIViewKey !== currentAI.id ) {
			Reaxel_View.setState( { currentAIViewKey : currentAI.id } );
		}
		
		for( const ai of activeAIs ) {
			const runtimeView = store.AIViews.find( item => item.id === ai.id );
			if( runtimeView ) {
				await updateRuntimeAIView( runtimeView , ai , settings );
			}
			if( ai.preloadOnStartup || ai.id === Reaxel_View.store.currentAIViewKey ) {
				await initAIView( ai , settings );
			}
		}
		
		applyVisibility();
	};
	
	const showAIView = async( aiId:string , settings:Settings ) => {
		const ai = settings.AIs.find( item => item.id === aiId && !item.disabled );
		if( !ai ) {
			return null;
		}
		const view = await initAIView( ai , settings );
		Reaxel_View.setState( {
			currentAIViewKey : ai.id ,
			settingsViewOpened : false,
		} );
		applyVisibility();
		view.webContents.focus();
		return view;
	};
	
	const applyVisibility = () => {
		const currentAIViewKey = Reaxel_View.store.currentAIViewKey;
		store.AIViews.forEach( runtimeView => {
			if( !runtimeView.view ) {
				return;
			}
			const visible = !Reaxel_View.store.settingsViewOpened && runtimeView.id === currentAIViewKey;
			runtimeView.view.setVisible( visible );
			if( visible ) {
				runtimeView.view.webContents.focus();
			}
		} );
	};
	
	const rtn = {
		get currentAIView() {
			return store.AIViews.find( item => item.id === Reaxel_View.store.currentAIViewKey ) || null;
		} ,
		initAIView ,
		destroyAIView ,
		syncAIViewsWithConfig ,
		showAIView ,
		applyVisibility,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const updateRuntimeAIView = async(
	runtimeView:RuntimeAIView ,
	ai:AI.AIItem ,
	settings:Settings,
) => {
	const nextDomain = ai.url || getAIDomainByFamily( ai.AI_family );
	const resolvedProxy = await applyAIProxyToView( runtimeView.view , ai , settings );
	const nextProxyKey = JSON.stringify( resolvedProxy );
	const domainChanged = runtimeView.domain !== nextDomain;
	const proxyChanged = runtimeView.proxyKey !== '' && runtimeView.proxyKey !== nextProxyKey;
	
	runtimeView.label = ai.label;
	runtimeView.AIName = ai.AI_family;
	runtimeView.domain = nextDomain;
	runtimeView.config = ai;
	runtimeView.proxyKey = nextProxyKey;
	
	if( domainChanged ) {
		await runtimeView.view.webContents.loadURL( nextDomain );
	} else if( proxyChanged ) {
		runtimeView.view.webContents.reloadIgnoringCache();
	}
};

const resolveCurrentAI = (settings:Settings):AI.AIItem | null => {
	const activeAIs = settings.AIs.filter( ai => !ai.disabled );
	if( activeAIs.length === 0 ) {
		return null;
	}
	const currentKey = Reaxel_View.store.currentAIViewKey;
	return activeAIs.find( ai => ai.id === currentKey )
		|| activeAIs.find( ai => ai.AI_family === currentKey )
		|| activeAIs[0];
};

const getAIPartition = (aiId:string) => {
	return `persist:ai-webapp-ai-${ aiId.replace( /[^a-zA-Z0-9_-]/g , '_' ) }`;
};

export type RuntimeAIView = {
	id: string;
	label: string;
	AIName: AI.AIFamily;
	view: WebContentsView;
	domain: string;
	partition: string;
	config: AI.AIItem;
	proxyKey: string;
};

import { getAIDomainByFamily } from './data';
import type { AI } from '#src/Types/SettingsTypes/AI';
import type { Settings } from '#src/Types/SettingsTypes';
import { initWebContentsView } from '#main/reaxels/Views/utils/initWebContentsView';
import { applyAIProxyToView } from '#main/services/settings/proxy-service';
import { mainWindow } from '#main/mainWindow';
import { Reaxel_View } from '../';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
import type { WebContentsView } from 'electron';
