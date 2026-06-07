export const reaxel_AIViews = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		AIViews : checkAs<RuntimeAIView[]>( [] ),
	} );

	useIpcSync( 'get-ai-page-environment' ).handle( ( { event } ) => {
		return getAIPageEnvironmentForWebContents( event.sender );
	} );

	const initAIView = ( ai:AI.AIItem , settings:Settings ) => {
		console.log( '[AIViews] initAIView start:' , ai.id , ai.url || getAIDomainByFamily( ai.AI_family ) );
		const existingRuntimeView = store.AIViews.find( item => item.id === ai.id );
		if( existingRuntimeView?.view ) {
			void updateRuntimeAIView( existingRuntimeView , ai , settings );
			Reaxel_View().fitWindow( ai.id );
			return existingRuntimeView.view;
		}
		
		const nextRuntimeView = createRuntimeAIView( ai , settings );
		
		mutate( s => {
			s.AIViews.push( nextRuntimeView );
		} );
		Reaxel_View().fitWindow( ai.id );
		
		return nextRuntimeView.view;
	};
	
	const destroyAIView = (id:string) => {
		const runtimeView = store.AIViews.find( item => item.id === id );
		if( !runtimeView?.view ) {
			return;
		}
		closeRuntimeWebContentsView( runtimeView.view , id , 'destroy' );
		mutate( s => {
			s.AIViews = s.AIViews.filter( item => item.id !== id );
		} );
	};
	
	/**
	 * 销毁所有AI Views并清除其session/storage数据
	 * 用于 Reset All AI Pages
	 */
	const destroyAllAndClearData = async(aiIds:string[] = []) => {
		const viewsCopy = store.AIViews.slice();
		
		// reset 需要覆盖未在本次运行期创建 view、但磁盘上已存在的历史 AI partition。
		const collectResult = collectResetPartitions( aiIds , viewsCopy );
		if( !collectResult.success ) {
			return collectResult;
		}
		
		// 销毁所有view
		viewsCopy.forEach( rv => {
			closeRuntimeWebContentsView( rv.view , rv.id , 'reset' );
		} );
		
		mutate( s => {
			s.AIViews = [];
		} );
		
		return await clearSessionPartitions( collectResult.partitions );
	};
	
	const syncAIViewsWithConfig = async( settings:Settings ) => {
		console.log( '[AIViews] syncAIViewsWithConfig start. AI count:' , settings.AIs.length );
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
				continue;
			}
			if( ai.preloadOnStartup || ai.id === Reaxel_View.store.currentAIViewKey ) {
				initAIView( ai , settings );
			}
		}
		
		applyVisibility();
	};
	
	const showAIView = ( aiId:string , settings:Settings ) => {
		const ai = settings.AIs.find( item => item.id === aiId && !item.disabled );
		if( !ai ) {
			return null;
		}
		Reaxel_View.setState( {
			currentAIViewKey : ai.id ,
			settingsViewOpened : false,
		} );
		const view = initAIView( ai , settings );
		applyVisibility();
		return view;
	};

	const getRuntimeAIViewsInSettingsOrder = (settings:Settings) => {
		const runtimeViewById = new Map( store.AIViews.map( runtimeView => [
			runtimeView.id ,
			runtimeView,
		] ) );
		const orderedRuntimeViews = settings.AIs
			.filter( ai => !ai.disabled )
			.map( ai => runtimeViewById.get( ai.id ) )
			.filter( ( runtimeView ): runtimeView is RuntimeAIView => !!runtimeView );
		const orderedIds = new Set( orderedRuntimeViews.map( runtimeView => runtimeView.id ) );
		return [
			...orderedRuntimeViews ,
			...store.AIViews.filter( runtimeView => !orderedIds.has( runtimeView.id ) ),
		];
	};

	const canCloseCurrentAIView = (settings:Settings) => {
		if( Reaxel_View.store.settingsViewOpened ) {
			return false;
		}
		const runtimeViews = getRuntimeAIViewsInSettingsOrder( settings );
		const currentIndex = runtimeViews.findIndex( runtimeView => {
			return runtimeView.id === Reaxel_View.store.currentAIViewKey;
		} );
		return runtimeViews.length > 1 && currentIndex !== -1;
	};

	const closeCurrentAIViewAndShowNext = (settings:Settings) => {
		if( !canCloseCurrentAIView( settings ) ) {
			return false;
		}
		const runtimeViews = getRuntimeAIViewsInSettingsOrder( settings );
		const currentIndex = runtimeViews.findIndex( runtimeView => {
			return runtimeView.id === Reaxel_View.store.currentAIViewKey;
		} );
		const currentRuntimeView = runtimeViews[currentIndex];
		const nextRuntimeView = runtimeViews[( currentIndex + 1 ) % runtimeViews.length];

		destroyAIView( currentRuntimeView.id );
		Reaxel_View.setState( {
			currentAIViewKey : nextRuntimeView.id ,
			settingsViewOpened : false,
		} );
		applyVisibility();
		return true;
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
				focusRuntimeAIViewIfReady( runtimeView );
			}
		} );
	};
	
	const rtn = {
		get currentAIView() {
			return store.AIViews.find( item => item.id === Reaxel_View.store.currentAIViewKey ) || null;
		} ,
		initAIView ,
		destroyAIView ,
		destroyAllAndClearData ,
		syncAIViewsWithConfig ,
		showAIView ,
		getRuntimeAIViewsInSettingsOrder ,
		canCloseCurrentAIView ,
		closeCurrentAIViewAndShowNext ,
		applyVisibility,
	};

	const createRuntimeAIView = (
		ai:AI.AIItem ,
		settings:Settings ,
		options:CreateRuntimeAIViewOptions = {},
	):RuntimeAIView => {
		const domain = ai.url || getAIDomainByFamily( ai.AI_family );
		const partition = getAIPartition( ai.id );
		const environment = getRuntimeAIPageEnvironment( settings );
		const view = initWebContentsView( {
			type : 'AI-View' ,
			domain : options.loadURL || domain ,
			aiConfig : ai ,
			settings ,
			refreshBounds : view => {
				Reaxel_View().fitContentView( view );
			} ,
			webPreferences : {
				partition,
			},
		} );
		setAIPageEnvironmentForView( view , environment );
		if( typeof options.visible === 'boolean' ) {
			view.setVisible( options.visible );
		}
		bindRuntimeAIViewReadyHandlers( ai.id , view );
		return {
			id : ai.id ,
			label : ai.label ,
			AIName : ai.AI_family ,
			view ,
			domain ,
			partition ,
			config : ai ,
			proxyKey : getRuntimeAIProxyKey( ai , settings ) ,
			appearanceKey : getAIPageAppearanceKey( environment ) ,
			ready : false,
		};
	};

	const bindRuntimeAIViewReadyHandlers = (aiId:string , view:WebContentsView) => {
		const markViewReady = () => {
			mutate( s => {
				const target = s.AIViews.find( item => item.id === aiId );
				if( target?.view === view ) {
					target.ready = true;
				}
			} );
			focusAIViewIfCurrent( aiId , view );
		};
		view.webContents.on( 'did-stop-loading' , markViewReady );
		view.webContents.on( 'did-fail-load' , markViewReady );
	};

	const updateRuntimeAIView = async(
		runtimeView:RuntimeAIView ,
		ai:AI.AIItem ,
		settings:Settings,
	) => {
		const nextDomain = ai.url || getAIDomainByFamily( ai.AI_family );
		const nextProxyKey = getRuntimeAIProxyKey( ai , settings );
		const nextEnvironment = getRuntimeAIPageEnvironment( settings );
		const nextAppearanceKey = getAIPageAppearanceKey( nextEnvironment );
		const domainChanged = runtimeView.domain !== nextDomain;
		const proxyChanged = runtimeView.proxyKey !== '' && runtimeView.proxyKey !== nextProxyKey;
		const appearanceChanged = runtimeView.appearanceKey !== '' && runtimeView.appearanceKey !== nextAppearanceKey;

		const resolvedProxy = await applyAIProxyToView( runtimeView.view , ai , settings );
		const appliedProxyKey = JSON.stringify( resolvedProxy );
		applyAIPageEnvironmentToView( runtimeView.view , nextEnvironment );
		const appliedAppearanceKey = getAIPageAppearanceKey( nextEnvironment );
		applyRuntimeAIViewConfig( runtimeView , ai , nextDomain , appliedProxyKey , appliedAppearanceKey );
		setAIPageEnvironmentForView( runtimeView.view , nextEnvironment );

		if( appearanceChanged ) {
			sendAIPageEnvironmentToView( runtimeView.view , nextEnvironment , runtimeView.id );
		}

		if( domainChanged ) {
			runtimeView.ready = false;
			void safeLoadAIURL( runtimeView.view , nextDomain , `domainChanged:${ runtimeView.id }` );
		} else if( proxyChanged ) {
			runtimeView.ready = false;
			runtimeView.view.webContents.reloadIgnoringCache();
		}
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const aiPageEnvironmentByWebContents = new WeakMap<WebContents , AIPageEnvironment>();

const safeLoadAIURL = async(
	view:WebContentsView ,
	url:string ,
	context:string,
) => {
	try {
		await view.webContents.loadURL( url );
	} catch ( error ) {
		console.warn( '[AIViews] loadURL failed:' , context , url , error );
	}
};

const applyRuntimeAIViewConfig = (
	runtimeView:RuntimeAIView ,
	ai:AI.AIItem ,
	domain:string ,
	proxyKey:string ,
	appearanceKey:string,
) => {
	runtimeView.label = ai.label;
	runtimeView.AIName = ai.AI_family;
	runtimeView.domain = domain;
	runtimeView.config = ai;
	runtimeView.proxyKey = proxyKey;
	runtimeView.appearanceKey = appearanceKey;
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

const PERSISTENT_PARTITION_PREFIX = 'persist:';
const AI_PARTITION_PREFIX = 'ai-webapp-ai-';

export const getAIPartition = (aiId:string) => {
	return `${ PERSISTENT_PARTITION_PREFIX }${ AI_PARTITION_PREFIX }${ aiId.replace( /[^a-zA-Z0-9_-]/g , '_' ) }`;
};

const getAIPartitionsForAIIds = (aiIds:string[]) => {
	return aiIds
		.filter( Boolean )
		.map( getAIPartition );
};

const collectResetPartitions = (
	aiIds:string[] ,
	runtimeViews:RuntimeAIView[],
) => {
	const persistedPartitions = getPersistedAIPartitionsFromUserData();
	return {
		success : persistedPartitions.errors.length === 0 ,
		partitions : uniqueStrings( [
			...getAIPartitionsForAIIds( aiIds ) ,
			...runtimeViews.map( runtimeView => runtimeView.partition ) ,
			...persistedPartitions.partitions,
		] ) ,
		errors : persistedPartitions.errors,
	};
};

const getPersistedAIPartitionsFromUserData = ():PersistedAIPartitionDiscoveryResult => {
	try {
		const partitionsDir = path.join( app.getPath( 'userData' ) , 'Partitions' );
		if( !fs.existsSync( partitionsDir ) ) {
			return {
				partitions : [] ,
				errors : [],
			};
		}
		return {
			partitions : fs.readdirSync( partitionsDir , { withFileTypes : true } )
				.filter( entry => entry.isDirectory() && entry.name.startsWith( AI_PARTITION_PREFIX ) )
				.map( entry => `${ PERSISTENT_PARTITION_PREFIX }${ entry.name }` ) ,
			errors : [],
		};
	} catch ( error ) {
		console.warn( '[AIViews] Failed to scan persisted AI partitions:' , error );
		return {
			partitions : [] ,
			errors : [
				{
					target : 'persisted AI partition directory' ,
					error : stringifyUnknownError( error ),
				},
			],
		};
	}
};

const clearSessionPartitions = async(partitions:string[]):Promise<ResetAISessionDataResult> => {
	const errors:ResetAISessionDataError[] = [];

	for( const partition of partitions ) {
		try {
			const ses = session.fromPartition( partition );
			await ses.clearStorageData();
			await ses.clearCache();
			await ses.clearAuthCache();
		} catch ( error ) {
			errors.push( {
				target : partition ,
				error : stringifyUnknownError( error ),
			} );
			console.warn( '[AIViews] Failed to clear session data for partition:' , partition , error );
		}
	}

	return {
		success : errors.length === 0 ,
		partitions ,
		errors,
	};
};

const stringifyUnknownError = (error:unknown) => {
	return error instanceof Error ? error.message : String( error );
};

const uniqueStrings = (items:string[]) => {
	return Array.from( new Set( items.filter( Boolean ) ) );
};

const getRuntimeAIProxyKey = (ai:AI.AIItem , settings:Settings) => {
	return JSON.stringify( resolveAIProxy( ai , settings ) );
};

const getRuntimeAIPageEnvironment = (settings:Settings) => {
	return getAIPageEnvironment( settings.appearance );
};

const setAIPageEnvironmentForView = (
	view:WebContentsView ,
	environment:AIPageEnvironment,
) => {
	aiPageEnvironmentByWebContents.set( view.webContents , environment );
};

const getAIPageEnvironmentForWebContents = (webContents:WebContents) => {
	return aiPageEnvironmentByWebContents.get( webContents ) || null;
};

const sendAIPageEnvironmentToView = (
	view:WebContentsView ,
	environment:AIPageEnvironment ,
	id:string,
) => {
	if( view.webContents.isDestroyed() ) {
		return;
	}
	useIpcMainToRenderer( 'ai-page-environment-change' ).targets( [
		view.webContents,
	] ).send( environment );
	console.info( '[AIViews] Sent AI page environment update:' , id );
};

const closeRuntimeWebContentsView = (
	view:WebContentsView ,
	id:string ,
	context:string,
) => {
	try {
		mainWindow.contentView.removeChildView( view );
		aiPageEnvironmentByWebContents.delete( view.webContents );
		if( !view.webContents.isDestroyed() ) {
			view.webContents.close();
		}
	} catch ( error ) {
		console.warn( '[AIViews] Failed to close AI view:' , context , id , error );
	}
};

const focusRuntimeAIViewIfReady = (runtimeView:RuntimeAIView) => {
	if( !runtimeView.ready ) {
		return;
	}
	focusAIViewIfReady( runtimeView.view );
};

const focusAIViewIfReady = (view:WebContentsView) => {
	if( view.webContents.isDestroyed() || view.webContents.isLoading() ) {
		return;
	}
	view.webContents.focus();
};

const focusAIViewIfCurrent = (aiId:string , view:WebContentsView) => {
	if(
		Reaxel_View.store.currentAIViewKey !== aiId
		|| Reaxel_View.store.settingsViewOpened
		|| !mainWindow.isFocused()
	) {
		return;
	}
	focusAIViewIfReady( view );
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
	appearanceKey: string;
	ready: boolean;
};

type CreateRuntimeAIViewOptions = {
	loadURL?: string;
	visible?: boolean;
};

type ResetAISessionDataError = {
	target: string;
	error: string;
};

type ResetAISessionDataResult = {
	success: boolean;
	partitions: string[];
	errors: ResetAISessionDataError[];
};

type PersistedAIPartitionDiscoveryResult = {
	partitions: string[];
	errors: ResetAISessionDataError[];
};

import { getAIDomainByFamily } from './data';
import type { AI } from '#src/Types/SettingsTypes/AI';
import type { Settings } from '#src/Types/SettingsTypes';
import { initWebContentsView } from '#main/reaxels/Views/utils/initWebContentsView';
import {
	applyAIProxyToView ,
	resolveAIProxy,
} from '#main/services/settings/proxy-service';
import {
	applyAIPageEnvironmentToView ,
	getAIPageEnvironment ,
	getAIPageAppearanceKey ,
} from '#main/services/appearance';
import {
	useIpcMainToRenderer ,
	useIpcSync,
} from '#main/services/ipc';
import { mainWindow } from '#main/mainWindow';
import { Reaxel_View } from '../';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
import {
	session ,
	app ,
	type WebContents ,
	type WebContentsView,
} from 'electron';
import type { AIPageEnvironment } from '#src/Types/AIPageEnvironment';
import * as fs from 'node:fs';
import * as path from 'node:path';
