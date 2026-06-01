
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

	const getWrappedIndex = (index:number , length:number) => {
		return ( index + length ) % length;
	};

	const createSwitchAiBarPayload = (
		activeAIs:AI.AIItem[] ,
		currentIndex:number ,
		direction:FloatingLayer.SwitchAiBarDirection,
	):FloatingLayer.SwitchAiBarPayload => {
		const total = activeAIs.length;
		const createItem = (offset:number , position:FloatingLayer.SwitchAiBarItemPosition) => {
			const ai = activeAIs[getWrappedIndex( currentIndex + offset , total )];
			return {
				id : ai.id ,
				label : ai.label ,
				family : ai.AI_family ,
				position,
			};
		};

		return {
			direction ,
			items : [
				createItem( -1 , 'prev' ) ,
				createItem( 0 , 'current' ) ,
				createItem( 1 , 'next' ),
			] ,
			currentId : activeAIs[currentIndex].id ,
			sequence : Date.now() ,
			total,
		};
	};

	const turnToAiPageByOffset = async(
		offset:number ,
		direction:FloatingLayer.SwitchAiBarDirection,
	) => {
		const settings = getRuntimeSettings();
		const activeAIs = settings.AIs.filter( ai => !ai.disabled );
		if( activeAIs.length === 0 ) {
			reaxel_FloatingLayer().api.hideSwitchAiBar();
			return null;
		}

		const currentIndex = activeAIs.findIndex( ai => ai.id === store.currentAIViewKey );
		const baseIndex = currentIndex === -1
			? offset > 0 ? -1 : 0
			: currentIndex;
		const nextIndex = getWrappedIndex( baseIndex + offset , activeAIs.length );
		const nextAI = activeAIs[nextIndex];
		const view = await reaxel_AIViews().showAIView( nextAI.id , settings );

		reaxel_FloatingLayer().api.showSwitchAiBar(
			createSwitchAiBarPayload( activeAIs , nextIndex , direction ),
		);

		return view;
	};

	const turnToNextAiPage = () => {
		return turnToAiPageByOffset( 1 , 'next' );
	};

	const turnToPreviousAiPage = () => {
		return turnToAiPageByOffset( -1 , 'previous' );
	};

	app.whenReady().then( async() => {
		reaxel_FloatingLayer().initFloatingLayer();
		await onReadyLoadAIView();
		mainWindow.on( 'resize' , () => {
			fitWindow();
		} );

		useIpcRendererToMain( 'update-preload-ai-config' ).on( async() => {
			await reaxel_AIViews().syncAIViewsWithConfig( getRuntimeSettings() );
		} );

		useIpcRendererToMain( 'turn-to-next-ai-page' ).on( () => {
			void turnToNextAiPage();
		} );

		useIpcRendererToMain( 'turn-to-previous-ai-page' ).on( () => {
			void turnToPreviousAiPage();
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
		turnToNextAiPage ,
		turnToPreviousAiPage,
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
import { reaxel_FloatingLayer } from "#main/reaxels/Views/Floating-Layer";
import { useIpcRendererToMain } from "#main/services/ipc";
import { getAIConfigService } from "#main/services/settings/ai-config-service";
import { getSettingsConfigService } from "#main/services/settings/settings-config-service";
import type { FloatingLayer } from "#src/Types/FloatingLayer";
import type { AI } from "#src/Types/SettingsTypes/AI";
import type { Settings } from "#src/Types/SettingsTypes";
import {
	createReaxable ,
	obsReaction ,
	reaxel,
} from "reaxes";
