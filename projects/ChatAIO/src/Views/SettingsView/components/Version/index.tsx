/**
 * Version Panel — 当前 / 最新版本 changelog + 应用内更新
 */
export const RCVersionPanel = reaxper( () => {
	const { store , setState } = reaxel_SettingsView;
	const [ updateState , setUpdateState ] = useState<AppUpdater.State | null>( null );
	const [ changelogs , setChangelogs ] = useState<AppUpdater.Changelogs | null>( null );
	const [ loadingChangelogs , setLoadingChangelogs ] = useState( false );
	const [ updating , setUpdating ] = useState( false );

	const activeTab = store.VersionUI.activeTab;
	const updateAvailable = updateState?.updateAvailable === true;

	const refreshChangelogs = async() => {
		setLoadingChangelogs( true );
		try {
			const result = await api.fetchVersionChangelogs();
			setChangelogs( result );
		} catch ( error ) {
			console.error( '[VersionPanel] fetch changelogs failed:' , error );
		} finally {
			setLoadingChangelogs( false );
		}
	};

	useEffect( () => {
		let disposed = false;
		void ( async() => {
			try {
				const state = await api.getUpdateState();
				if( !disposed ) setUpdateState( state );
			} catch ( error ) {
				console.error( '[VersionPanel] getUpdateState failed:' , error );
			}
			if( !disposed ) {
				await refreshChangelogs();
			}
		} )();
		const dispose = api.onUpdateStateChanged( ( state ) => {
			setUpdateState( state );
		} );
		return () => {
			disposed = true;
			dispose.dispose();
		};
	} , [] );

	useEffect( () => {
		void refreshChangelogs();
	} , [ updateState?.availableVersion , updateState?.updateAvailable ] );

	useEffect( () => {
		if( !updateAvailable && activeTab === 'latest' ) {
			setState.VersionUI( { activeTab : 'current' } );
		}
	} , [ updateAvailable , activeTab ] );

	const onDownloadUpdate = async() => {
		setUpdating( true );
		try {
			const result = await api.downloadAndInstallUpdate();
			if( !result.success ) {
				message.error( result.error || i18n( 'Update failed' ) );
			}
		} catch ( error ) {
			message.error( error instanceof Error ? error.message : i18n( 'Update failed' ) );
		} finally {
			setUpdating( false );
		}
	};

	const tabItems = [
		{
			key : 'current' ,
			label : <I18n>Current</I18n> ,
			children : <ChangelogBlock
				version={ changelogs?.current.version || updateState?.currentVersion || '—' }
				body={ changelogs?.current.body }
				error={ changelogs?.current.error }
				loading={ loadingChangelogs }
				emptyHint={ <I18n>No changelog for this version</I18n> }
			/> ,
		} ,
		...( updateAvailable ? [ {
			key : 'latest' ,
			label : <I18n>Latest</I18n> ,
			children : <div className="version-latest-panel">
				<ChangelogBlock
					version={ changelogs?.latest?.version || updateState?.availableVersion || '—' }
					body={ changelogs?.latest?.body }
					error={ changelogs?.latest?.error }
					loading={ loadingChangelogs }
					emptyHint={ <I18n>No changelog for this version</I18n> }
				/>
				<div className="version-update-actions">
					{ updateState?.status === 'downloading' ? (
						<div className="version-download-progress">
							<Progress
								percent={ updateState.downloadProgress ?? 0 }
								size="small"
							/>
							<span><I18n>Downloading update</I18n></span>
						</div>
					) : null }
					{ updateState?.status === 'downloaded' ? (
						<Alert
							type="success"
							showIcon
							message={ <I18n>Update downloaded. Restart to install.</I18n> }
						/>
					) : null }
					{ updateState?.error ? (
						<Alert
							type="error"
							showIcon
							message={ updateState.error }
						/>
					) : null }
					<Button
						type="primary"
						loading={ updating || updateState?.status === 'downloading' }
						onClick={ () => void onDownloadUpdate() }
					>
						{ updateState?.status === 'downloaded'
							? <I18n>Restart to Install</I18n>
							: <I18n>Download Update</I18n> }
					</Button>
				</div>
			</div> ,
		} ] : [] ),
	];

	return <div className="settings-section version-section">
		<div className="section-title"><I18n>Version</I18n></div>
		{ !updateAvailable && updateState?.status === 'not-available' ? (
			<Alert
				type="success"
				showIcon
				style={ { marginBottom : 16 } }
				message={ <I18n>Up to date</I18n> }
			/>
		) : null }
		{ updateAvailable ? (
			<Alert
				type="info"
				showIcon
				style={ { marginBottom : 16 } }
				message={ <>
					<I18n>New version available</I18n>
					{ updateState?.availableVersion ? `: ${ updateState.availableVersion }` : '' }
				</> }
			/>
		) : null }
		<Tabs
			activeKey={ updateAvailable ? activeTab : 'current' }
			onChange={ ( key ) => {
				setState.VersionUI( {
					activeTab : key === 'latest' ? 'latest' : 'current' ,
				} );
			} }
			items={ tabItems }
		/>
	</div>;
} );

const ChangelogBlock = reaxper( ( {
	version ,
	body ,
	error ,
	loading ,
	emptyHint ,
} : {
	version : string;
	body : string | null | undefined;
	error? : string | null;
	loading : boolean;
	emptyHint : React.ReactNode;
} ) => {
	if( loading && body == null ) {
		return <div className="version-changelog-loading"><Spin /></div>;
	}
	return <div className="version-changelog">
		<div className="version-changelog__meta">
			<span className="version-changelog__label"><I18n>Version</I18n></span>
			<span className="version-changelog__value">{ version }</span>
		</div>
		{ error ? (
			<Alert type="warning" showIcon message={ error } style={ { marginBottom : 12 } } />
		) : null }
		{ body ? (
			<pre className="version-changelog__body">{ body }</pre>
		) : (
			<div className="version-changelog__empty">{ emptyHint }</div>
		) }
	</div>;
} );


import { reaxel_SettingsView } from '#SettingsView/reaxels/settings-view';
import { I18n , i18n } from '#SettingsView/reaxels/exports';
import type { AppUpdater } from '#src/Types/AppUpdater';
import {
	Alert ,
	Button ,
	Progress ,
	Spin ,
	Tabs ,
	message ,
} from 'antd';
import {
	useEffect ,
	useState ,
} from 'react';
import { reaxper } from 'reaxes-react';
