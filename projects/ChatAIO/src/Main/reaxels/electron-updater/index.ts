const RELEASES_OWNER = 'Kane-Kuroneko';
const RELEASES_REPO = 'ChatAIO-Releases';
const RELEASES_API_BASE = `https://api.github.com/repos/${ RELEASES_OWNER }/${ RELEASES_REPO }`;

export const reaxel_AppUpdater = reaxel( () => {
	const {
		store ,
		setState ,
	} = createReaxable( {
		status : checkAs<AppUpdater.Status>( 'idle' ) ,
		currentVersion : app.getVersion() ,
		availableVersion : null as string | null ,
		downloadProgress : null as number | null ,
		error : null as string | null ,
		updateAvailable : false ,
		updateInfo : null as UpdateInfo | null ,
	} );

	autoUpdater.autoDownload = false;
	autoUpdater.autoInstallOnAppQuit = true;
	if( dev() ) {
		autoUpdater.forceDevUpdateConfig = true;
	}
	/* GitHub Latest 必须是带 latest.yml 的安装包 tag。目录 tag `ai-catalog` 禁止标成 Latest。 */

	const getPublicState = (): AppUpdater.State => ( {
		status : store.status ,
		currentVersion : store.currentVersion ,
		availableVersion : store.availableVersion ,
		downloadProgress : store.downloadProgress ,
		error : store.error ,
		updateAvailable : store.updateAvailable ,
	} );

	const broadcastState = () => {
		const payload = getPublicState();
		const targets : Electron.WebContents[] = [];
		if( mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed() ) {
			targets.push( mainWindow.webContents );
		}
		const settingsView = reaxel_SettingsView.store.settingsView.view;
		if( settingsView && !settingsView.webContents.isDestroyed() ) {
			targets.push( settingsView.webContents );
		}
		if( targets.length === 0 ) return;
		useIpcMainToRenderer( 'update-state-changed' )
			.targets( targets )
			.send( payload );
	};

	const setUpdaterState = ( patch : Partial<{
		status : AppUpdater.Status;
		availableVersion : string | null;
		downloadProgress : number | null;
		error : string | null;
		updateAvailable : boolean;
		updateInfo : UpdateInfo | null;
	}> ) => {
		setState( patch );
		broadcastState();
	};

	const checkForUpdates = async(): Promise<AppUpdater.State> => {
		if( store.status === 'checking' || store.status === 'downloading' ) {
			return getPublicState();
		}
		setUpdaterState( {
			status : 'checking' ,
			error : null ,
		} );
		try {
			const result = await autoUpdater.checkForUpdates();
			if( !result?.updateInfo ) {
				setUpdaterState( {
					status : 'not-available' ,
					updateAvailable : false ,
					availableVersion : null ,
					updateInfo : null ,
				} );
			}
			/* update-available / update-not-available 事件会继续收敛状态 */
			return getPublicState();
		} catch ( error ) {
			const message = error instanceof Error ? error.message : String( error );
			console.error( '[AppUpdater] checkForUpdates failed:' , message );
			setUpdaterState( {
				status : 'error' ,
				error : message ,
			} );
			return getPublicState();
		}
	};

	const downloadAndInstallUpdate = async(): Promise<AppUpdater.DownloadResult> => {
		if( !store.updateAvailable || !store.updateInfo ) {
			return {
				success : false ,
				error : 'No update available' ,
			};
		}
		if( store.status === 'downloaded' ) {
			installDownloadedUpdate();
			return { success : true };
		}
		if( store.status === 'downloading' ) {
			return { success : true };
		}
		try {
			setUpdaterState( {
				status : 'downloading' ,
				downloadProgress : 0 ,
				error : null ,
			} );
			await autoUpdater.downloadUpdate();
			return { success : true };
		} catch ( error ) {
			const message = error instanceof Error ? error.message : String( error );
			console.error( '[AppUpdater] downloadUpdate failed:' , message );
			setUpdaterState( {
				status : 'error' ,
				error : message ,
				downloadProgress : null ,
			} );
			return {
				success : false ,
				error : message ,
			};
		}
	};

	const installDownloadedUpdate = () => {
		try {
			destroyTray();
			( app as any ).__chatAIOQuitting = true;
			autoUpdater.quitAndInstall( false , true );
		} catch ( error ) {
			const message = error instanceof Error ? error.message : String( error );
			console.error( '[AppUpdater] quitAndInstall failed:' , message );
			setUpdaterState( {
				status : 'error' ,
				error : message ,
			} );
		}
	};

	const fetchReleaseBodyByVersion = async( version : string ): Promise<AppUpdater.ChangelogEntry> => {
		const candidates = version.startsWith( 'v' )
			? [ version , version.slice( 1 ) ]
			: [ version , `v${ version }` ];
		let lastError : string | null = null;
		for( const tag of candidates ) {
			try {
				const response = await fetch( `${ RELEASES_API_BASE }/releases/tags/${ encodeURIComponent( tag ) }` , {
					headers : {
						Accept : 'application/vnd.github+json' ,
						'User-Agent' : 'ChatAIO' ,
					},
				} );
				if( response.status === 404 ) {
					continue;
				}
				if( !response.ok ) {
					lastError = `GitHub API ${ response.status }`;
					continue;
				}
				const data = await response.json() as { body? : string | null; tag_name? : string };
				return {
					version ,
					body : typeof data.body === 'string' ? data.body : null ,
				};
			} catch ( error ) {
				lastError = error instanceof Error ? error.message : String( error );
			}
		}
		return {
			version ,
			body : null ,
			error : lastError || 'Release not found' ,
		};
	};

	const changelogTranslateCache = new Map<string , { body : string; translated : boolean }>();

	const localizeChangelogEntry = async(
		entry : AppUpdater.ChangelogEntry ,
		language? : Languages ,
	): Promise<AppUpdater.ChangelogEntry> => {
		if( !entry.body || !language || shouldSkipGoogleTranslate( language ) ) {
			return {
				...entry ,
				translated : false ,
			};
		}

		const bodyFingerprint = `${ entry.body.length }:${ entry.body.slice( 0 , 40 ) }:${ entry.body.slice( -40 ) }`;
		const cacheKey = `${ entry.version }::${ toGoogleTranslateLanguage( language ) }::${ bodyFingerprint }`;
		const cached = changelogTranslateCache.get( cacheKey );
		if( cached ) {
			return {
				...entry ,
				body : cached.body ,
				translated : cached.translated ,
			};
		}

		try {
			const translatedBody = await translateMarkdownViaGoogle( entry.body , language );
			const translated = translatedBody !== entry.body;
			changelogTranslateCache.set( cacheKey , {
				body : translatedBody ,
				translated ,
			} );
			return {
				...entry ,
				body : translatedBody ,
				translated ,
			};
		} catch ( error ) {
			console.warn(
				'[AppUpdater] translate changelog failed:' ,
				error instanceof Error ? error.message : error ,
			);
			return {
				...entry ,
				translated : false ,
			};
		}
	};

	const fetchVersionChangelogs = async( language? : Languages ): Promise<AppUpdater.Changelogs> => {
		const targetLanguage = language || ( reaxel_I18n().language as Languages );
		const currentVersion = app.getVersion();
		const current = await localizeChangelogEntry(
			await fetchReleaseBodyByVersion( currentVersion ) ,
			targetLanguage ,
		);
		if( !store.updateAvailable || !store.availableVersion ) {
			return {
				current ,
				latest : null ,
			};
		}
		/*
		 * 始终走 GitHub Releases API 的 markdown body。
		 * electron-updater 的 updateInfo.releaseNotes 来自 Atom feed 的 content，
		 * 是 HTML，交给 react-markdown 会整页显示为原始标签。
		 */
		const latest = await localizeChangelogEntry(
			await fetchReleaseBodyByVersion( store.availableVersion ) ,
			targetLanguage ,
		);
		return {
			current ,
			latest ,
		};
	};

	const openSettingsVersion = ( versionTab : AppUpdater.VersionTab = 'latest' ) => {
		const settingsView = reaxel_SettingsView().initSettingsView();
		Reaxel_View.setState( { settingsViewOpened : true } );
		Reaxel_View().fitWindow();
		reaxel_Menu().scheduleMenuUpdate();

		const sendNavigate = () => {
			if( settingsView.webContents.isDestroyed() ) return;
			useIpcMainToRenderer( 'settings-view:navigate' )
				.targets( [ settingsView.webContents ] )
				.send( {
					menu : 'about' ,
					versionTab ,
				} );
		};

		if( settingsView.webContents.isLoadingMainFrame() ) {
			settingsView.webContents.once( 'did-finish-load' , sendNavigate );
		} else {
			/* Settings SPA 已加载：稍后发送，避免与首帧竞态 */
			setTimeout( sendNavigate , 50 );
		}
	};

	autoUpdater.on( 'checking-for-update' , () => {
		setUpdaterState( {
			status : 'checking' ,
			error : null ,
		} );
	} );

	autoUpdater.on( 'update-available' , ( info ) => {
		setUpdaterState( {
			status : 'available' ,
			updateAvailable : true ,
			availableVersion : info.version ,
			updateInfo : info ,
			error : null ,
		} );
	} );

	autoUpdater.on( 'update-not-available' , () => {
		setUpdaterState( {
			status : 'not-available' ,
			updateAvailable : false ,
			availableVersion : null ,
			updateInfo : null ,
			error : null ,
		} );
	} );

	autoUpdater.on( 'error' , ( err ) => {
		const message = err?.message || String( err );
		if( /ai-catalog[/\\]latest\.yml/.test( message ) ) {
			console.error( '[AppUpdater] GitHub Latest 被目录 tag ai-catalog 抢走了，没有 latest.yml。publish:ai-catalog 必须 --latest=false。' );
		} else {
			console.error( '[AppUpdater] error:' , err );
		}
		setUpdaterState( {
			status : 'error' ,
			error : message ,
		} );
	} );

	autoUpdater.on( 'download-progress' , ( progress ) => {
		setUpdaterState( {
			status : 'downloading' ,
			downloadProgress : Number( progress.percent.toFixed( 1 ) ) ,
		} );
	} );

	autoUpdater.on( 'update-downloaded' , ( info ) => {
		setUpdaterState( {
			status : 'downloaded' ,
			downloadProgress : 100 ,
			availableVersion : info.version ,
			updateInfo : info ,
			updateAvailable : true ,
		} );
		dialog.showMessageBox( {
			type : 'info' ,
			buttons : [ 'Restart Now' , 'Later' ] ,
			defaultId : 0 ,
			cancelId : 1 ,
			message : `Version ${ info.version } has been downloaded. Restart to install?` ,
		} ).then( ( result ) => {
			if( result.response === 0 ) {
				installDownloadedUpdate();
			}
		} );
	} );

	useIpcRpc( 'get-app-version' ).handle( async() => app.getVersion() );
	useIpcRpc( 'get-update-state' ).handle( async() => getPublicState() );
	useIpcRpc( 'check-for-updates' ).handle( async() => checkForUpdates() );
	useIpcRpc( 'fetch-version-changelogs' ).handle( async( _ , language ) => fetchVersionChangelogs( language ) );
	useIpcRpc( 'download-and-install-update' ).handle( async() => downloadAndInstallUpdate() );

	useIpcRendererToMain( 'open-settings-version' ).on( ( _e , versionTab ) => {
		openSettingsVersion( versionTab || 'latest' );
	} );

	/* 启动后静默检查（延后，避免阻塞启动）。E2E 禁止打 GitHub，避免弹窗/超时。 */
	if( isChatAioE2E() === false ) {
		setTimeout( () => {
			void checkForUpdates();
		} , 4000 );
	}

	const rtn = {
		checkForUpdates ,
		downloadAndInstallUpdate ,
		openSettingsVersion ,
		getPublicState ,
		broadcastState ,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
	} );
} );


import { reaxel_SettingsView } from '#main/reaxels/Views/Settings-View';
import { Reaxel_View } from '#main/reaxels/Views';
import { reaxel_Menu } from '#main/reaxels/Menu';
import { reaxel_I18n } from '#main/reaxels/I18n';
import { mainWindow } from '#main/mainWindow';
import { isChatAioE2E } from '#main/foundation/e2e-mode';
import { destroyTray } from '#main/services/tray';
import {
	useIpcMainToRenderer ,
	useIpcRendererToMain ,
	useIpcRpc ,
} from '#main/services/ipc';
import {
	shouldSkipGoogleTranslate ,
	toGoogleTranslateLanguage ,
	translateMarkdownViaGoogle ,
} from '#shared/utils/google-translate.utility';
import type { AppUpdater } from '#src/Types/AppUpdater';
import type { Languages } from '#src/Types/Languages';
import {
	app ,
	dialog ,
} from 'electron';
import {
	autoUpdater ,
	type UpdateInfo ,
} from 'electron-updater';
import { createReaxable , reaxel } from 'reaxes';
import { dev } from 'electron-is';
