
export const Reaxel_View = reaxel( () => {
	const electronStore = new ElectronStore<{
		previously_used_ai: string,
	}>( { name : "previously-used-ai" } );
	const previouslyUsedAI = electronStore.get( "previously_used_ai" ) || "";
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		currentAIViewKey : previouslyUsedAI ,
		settingsViewOpened : false,
	} );
	
	function fitWindow(target?:string) {
		const viewSetBounds = (view:WebContentsView) => view?.setBounds( {
			x : 0 ,
			y : 0 ,
			width : mainWindow.getContentBounds().width ,
			height : mainWindow.getContentBounds().height,
		} );
		
		if( target ) {
			const runtimeView = reaxel_AIViews.store.AIViews.find( item => item.id === target );
			viewSetBounds( runtimeView?.view );
			return;
		}
		reaxel_AIViews.store.AIViews.forEach( runtimeView => {
			viewSetBounds( runtimeView.view );
		} );
		viewSetBounds( reaxel_SettingsView.store.settingsView.view );
	}
	
	async function onReadyLoadAIView() {
		const settings = getRuntimeSettings();
		const activeAIs = settings.AIs.filter( ai => !ai.disabled );
		const targetAI = activeAIs.find( ai => ai.id === store.currentAIViewKey )
			|| activeAIs.find( ai => ai.AI_family === store.currentAIViewKey )
			|| activeAIs[0];
		
		if( targetAI ) {
			setState( { currentAIViewKey : targetAI.id } );
			await reaxel_AIViews().syncAIViewsWithConfig( settings );
		}
	}
	
	app.whenReady().then( async() => {
		await onReadyLoadAIView();
		mainWindow.on( 'resize' , () => {
			fitWindow();
		} );
		
		useIpcRendererToMain( 'update-preload-ai-config' ).on( async() => {
			await reaxel_AIViews().syncAIViewsWithConfig( getRuntimeSettings() );
		} );
	} );
	
	obsReaction( ( first ) => {
		if( first ) return;
		if( store.currentAIViewKey ) {
			electronStore.set( "previously_used_ai" , store.currentAIViewKey );
		}
	} , () => [ store.currentAIViewKey ] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		
		reaxel_SettingsView.store.settingsView.view?.setVisible( store.settingsViewOpened );
		reaxel_AIViews().applyVisibility();
	} , () => [
		store.settingsViewOpened ,
		store.currentAIViewKey,
	] );
	
	const rtn = {
		fitWindow,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const getRuntimeSettings = ():Settings => {
	const settingsConfigService = getSettingsConfigService();
	const aiConfigService = getAIConfigService();
	return {
		...settingsConfigService.getEffectiveSettings() ,
		AIs : aiConfigService.getEffectiveAIs(),
	};
};

import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import {
	app ,
	WebContentsView,
} from "electron";
import ElectronStore from "electron-store";
import { mainWindow } from "#main/mainWindow";
import { reaxel_AIViews } from "#main/reaxels/Views/AI-Views";
import { useIpcRendererToMain } from "#main/services/ipc";
import { getAIConfigService } from "#main/services/settings/ai-config-service";
import { getSettingsConfigService } from "#main/services/settings/settings-config-service";
import type { Settings } from "#src/Types/SettingsTypes";
import {
	createReaxable ,
	obsReaction ,
	reaxel,
} from "reaxes";
