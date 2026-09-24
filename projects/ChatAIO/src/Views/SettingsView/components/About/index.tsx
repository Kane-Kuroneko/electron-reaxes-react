/**
 * About — 面向 C 端产品介绍；版本/更新收进右侧 Sheet
 * Hero 上的 v* 按钮打开 Sheet；菜单栏「有更新」导航也会打开同一 Sheet
 * 主号是发行 SemVer；副号是 git build 身份。docs/architecture/app-version-identity.md
 */
export const RCAboutPanel = reaxper( () => {
	const { store , setState } = reaxel_SettingsView;
	const language = reaxel_I18n.store.language;
	const [ updateState , setUpdateState ] = useState<AppUpdater.State | null>( null );
	const [ changelogs , setChangelogs ] = useState<AppUpdater.Changelogs | null>( null );
	const [ loadingChangelogs , setLoadingChangelogs ] = useState( false );
	const [ fetchError , setFetchError ] = useState<string | null>( null );
	const [ updating , setUpdating ] = useState( false );
	const [ checking , setChecking ] = useState( false );

	const version = updateState?.currentVersion || '—';
	const buildIdentity = updateState?.buildIdentity ?? null;
	const versionLabel = version === '—'
		? '—'
		: formatChatAioVersionLabel( version , buildIdentity );
	const buildSubtitle = buildIdentity ? formatChatAioBuildSubtitle( buildIdentity ) : null;
	const activeTab = store.VersionUI.activeTab;
	const drawerOpen = store.VersionUI.drawerOpen;
	const updateAvailable = updateState?.updateAvailable === true;

	const openVersionDrawer = ( tab : AppUpdater.VersionTab = activeTab ) => {
		setState.VersionUI( {
			drawerOpen : true ,
			activeTab : !updateAvailable && tab === 'latest' ? 'current' : tab ,
		} );
	};

	const closeVersionDrawer = () => {
		setState.VersionUI( { drawerOpen : false } );
	};

	const refreshChangelogs = async() => {
		setLoadingChangelogs( true );
		setFetchError( null );
		try {
			const result = await api.fetchVersionChangelogs( language );
			setChangelogs( result );
		} catch ( error ) {
			console.error( '[AboutPanel] fetch changelogs failed:' , error );
			setFetchError( error instanceof Error ? error.message : i18n( 'Failed to fetch changelog' ) );
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
				console.error( '[AboutPanel] getUpdateState failed:' , error );
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
		if( !drawerOpen ) return;
		void refreshChangelogs();
	} , [ drawerOpen , updateState?.availableVersion , updateState?.updateAvailable , language ] );

	useEffect( () => {
		if( !updateAvailable && activeTab === 'latest' ) {
			setState.VersionUI( { activeTab : 'current' } );
		}
	} , [ updateAvailable , activeTab ] );

	const onCopyVersion = async() => {
		if( !versionLabel || versionLabel === '—' ) return;
		try {
			await navigator.clipboard.writeText( versionLabel );
			toast.success( i18n( 'Version copied' ) );
		} catch ( error ) {
			toast.error( error instanceof Error ? error.message : i18n( 'Copy failed' ) );
		}
	};

	const onOpenReleases = async() => {
		const result = await api.openExternalUrl( CHATAIO_RELEASES_URL );
		if( !result.success ) {
			toast.error( result.error || i18n( 'Failed to open link' ) );
		}
	};

	const onCheckUpdates = async() => {
		setChecking( true );
		try {
			const state = await api.checkForUpdates();
			setUpdateState( state );
			if( state.updateAvailable ) {
				setState.VersionUI( { activeTab : 'latest' , drawerOpen : true } );
				toast.info( `${ i18n( 'New version available' ) }: ${ state.availableVersion || '' }` );
			} else if( state.status === 'error' ) {
				toast.error( state.error || i18n( 'Update failed' ) );
			} else {
				toast.success( i18n( 'Up to date' ) );
			}
		} catch ( error ) {
			toast.error( error instanceof Error ? error.message : i18n( 'Update failed' ) );
		} finally {
			setChecking( false );
		}
	};

	const onDownloadUpdate = async() => {
		setUpdating( true );
		try {
			const result = await api.downloadAndInstallUpdate();
			if( !result.success ) {
				toast.error( result.error || i18n( 'Update failed' ) );
			}
		} catch ( error ) {
			toast.error( error instanceof Error ? error.message : i18n( 'Update failed' ) );
		} finally {
			setUpdating( false );
		}
	};

	const versionButtonTitle = updateAvailable
		? `${ i18n( 'New version available' ) }${ updateState?.availableVersion ? `: ${ updateState.availableVersion }` : '' }`
		: versionLabel !== '—' ? versionLabel : i18n( 'Version & Updates' );

	const tabValue = updateAvailable ? activeTab : 'current';

	return <div className="about-page">
		<section className="about-hero settings-section">
			<div className="about-hero__brand">
				<img
					className="about-hero__logo"
					src={ appIconUrl }
					alt=""
					draggable={ false }
				/>
				<div className="about-hero__text">
					<h1 className="about-hero__name">ChatAIO</h1>
					<p className="about-hero__slogan">
						<I18n>One desktop home for every AI you use</I18n>
					</p>
				</div>
			</div>
			<p className="about-hero__lore">
				<I18n>The web of nodes stands for the Web — every AI connected in one place</I18n>
			</p>
			{ updateAvailable ? (
				<Alert className="about-hero__update-alert mb-3 flex items-center justify-between gap-3">
					<AlertDescription>
						<I18n>New version available</I18n>
						{ updateState?.availableVersion ? `: ${ updateState.availableVersion }` : '' }
					</AlertDescription>
					<Button
						size="sm"
						onClick={ () => openVersionDrawer( 'latest' ) }
					>
						<I18n>View update</I18n>
					</Button>
				</Alert>
			) : null }
			<div className="about-hero__actions">
				<span className="relative inline-flex">
					{ updateAvailable ? <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" /> : null }
					<button
						type="button"
						className={ `about-hero__action-btn about-hero__version-btn${ updateAvailable ? ' about-hero__version-btn--update' : '' }` }
						onClick={ () => openVersionDrawer( updateAvailable ? 'latest' : 'current' ) }
						title={ versionButtonTitle }
						aria-label={ versionButtonTitle }
					>
						<History className="about-hero__action-btn-icon h-4 w-4" />
						<span className="about-hero__version-btn-caption"><I18n>Version</I18n></span>
						<span className="about-hero__version-btn-ver">v{ version }</span>
						{ buildSubtitle ? (
							<span className="about-hero__version-btn-build">{ buildSubtitle }</span>
						) : null }
						{ updateAvailable ? (
							<span className="about-hero__version-tag">NEW</span>
						) : null }
						<ChevronRight className="about-hero__version-btn-arrow h-4 w-4" />
					</button>
				</span>
				<button
					type="button"
					className="about-hero__action-btn about-hero__github-btn"
					onClick={ () => void onOpenReleases() }
				>
					<Github className="about-hero__action-btn-icon h-4 w-4" />
					<span className="about-hero__github-btn-label"><I18n>GitHub Releases</I18n></span>
				</button>
			</div>
		</section>

		<section className="about-features settings-section">
			<div className="section-title"><I18n>Why ChatAIO</I18n></div>
			<div className="about-features__grid">
				{ FEATURES.map( ( feature ) => (
					<div
						key={ feature.title }
						className="about-feature-card"
					>
						<div className="about-feature-card__icon">{ feature.icon }</div>
						<div className="about-feature-card__body">
							<h3 className="about-feature-card__title"><I18n>{ feature.title }</I18n></h3>
							<p className="about-feature-card__desc"><I18n>{ feature.desc }</I18n></p>
						</div>
					</div>
				) ) }
			</div>
		</section>

		<section className="about-meta settings-section">
			<div className="section-title"><I18n>Open Source</I18n></div>
			<div className="about-meta__rows">
				<div className="about-meta__row">
					<span className="about-meta__label"><I18n>Developer</I18n></span>
					<span className="about-meta__value">Kuroneko</span>
				</div>
				<div className="about-meta__row">
					<span className="about-meta__label"><I18n>License</I18n></span>
					<span className="about-meta__value">WTFPL</span>
				</div>
				<div className="about-meta__row">
					<span className="about-meta__label"><I18n>Tech Stack</I18n></span>
					<span className="about-meta__value">Electron · React · Reaxes · shadcn/ui · TypeScript</span>
				</div>
				<div className="about-meta__row about-meta__row--stack">
					<span className="about-meta__label"><I18n>Thanks</I18n></span>
					<span className="about-meta__value">
						<I18n>Built with Electron, React, Reaxes, and shadcn/ui. Releases published via GitHub.</I18n>
					</span>
				</div>
			</div>
		</section>

		<Sheet
			open={ drawerOpen }
			onOpenChange={ ( open ) => {
				if( open === false ) closeVersionDrawer();
			} }
		>
			<SheetContent
				side="right"
				className="flex w-[min(60vw,720px)] flex-col overflow-y-auto sm:max-w-none"
			>
				<SheetHeader>
					<SheetTitle><I18n>Version & Updates</I18n></SheetTitle>
				</SheetHeader>
				<div className="mb-4 flex items-center gap-2">
					<SimpleTooltip content={ i18n( 'Copy version' ) }>
						<Button
							variant="ghost"
							size="icon"
							onClick={ () => void onCopyVersion() }
							aria-label={ i18n( 'Copy version' ) }
						>
							<Copy className="h-4 w-4" />
						</Button>
					</SimpleTooltip>
					<Button
						size="sm"
						variant="outline"
						loading={ checking || updateState?.status === 'checking' }
						onClick={ () => void onCheckUpdates() }
					>
						<RefreshCw className="h-3.5 w-3.5" />
						<I18n>Check for Updates</I18n>
					</Button>
				</div>
				<div className="about-version-drawer__body">
					<div className="about-version-drawer__summary">
						<span className="about-version-drawer__summary-label"><I18n>Current</I18n></span>
						<span className="about-version-drawer__summary-value">{ versionLabel }</span>
						{ updateAvailable ? (
							<>
								<span className="about-version-drawer__summary-label"><I18n>Latest</I18n></span>
								<span className="about-version-drawer__summary-value about-version-drawer__summary-value--accent">
									v{ updateState?.availableVersion || '—' }
								</span>
							</>
						) : null }
					</div>

					{ updateState?.status === 'checking' || checking ? (
						<Alert className="mb-3">
							<AlertDescription><I18n>Checking for updates</I18n></AlertDescription>
						</Alert>
					) : null }
					{ !updateAvailable && updateState?.status === 'not-available' ? (
						<Alert className="mb-3">
							<AlertDescription><I18n>Up to date</I18n></AlertDescription>
						</Alert>
					) : null }
					{ !updateAvailable && updateState?.status === 'error' && updateState?.error ? (
						<Alert variant="destructive" className="mb-3">
							<AlertDescription>{ updateState.error }</AlertDescription>
						</Alert>
					) : null }
					{ updateAvailable ? (
						<Alert className="mb-3">
							<AlertDescription>
								<I18n>New version available</I18n>
								{ updateState?.availableVersion ? `: ${ updateState.availableVersion }` : '' }
							</AlertDescription>
						</Alert>
					) : null }

					<Tabs
						value={ tabValue }
						onValueChange={ ( key ) => {
							setState.VersionUI( {
								activeTab : key === 'latest' ? 'latest' : 'current' ,
							} );
						} }
					>
						<TabsList>
							<TabsTrigger value="current"><I18n>What's new in this version</I18n></TabsTrigger>
							{ updateAvailable ? (
								<TabsTrigger value="latest"><I18n>What's new in the latest</I18n></TabsTrigger>
							) : null }
						</TabsList>
						<TabsContent value="current">
							<ChangelogBlock
								version={ changelogs?.current.version || updateState?.currentVersion || '—' }
								body={ changelogs?.current.body }
								translated={ changelogs?.current.translated }
								error={ changelogs?.current.error || fetchError }
								loading={ loadingChangelogs }
								onRefresh={ () => void refreshChangelogs() }
								emptyHint={ <I18n>No changelog for this version</I18n> }
							/>
						</TabsContent>
						{ updateAvailable ? (
							<TabsContent value="latest">
								<div className="about-latest-panel">
									<ChangelogBlock
										version={ changelogs?.latest?.version || updateState?.availableVersion || '—' }
										body={ changelogs?.latest?.body }
										translated={ changelogs?.latest?.translated }
										error={ changelogs?.latest?.error || fetchError }
										loading={ loadingChangelogs }
										onRefresh={ () => void refreshChangelogs() }
										emptyHint={ <I18n>No changelog for this version</I18n> }
									/>
								</div>
							</TabsContent>
						) : null }
					</Tabs>
				</div>
				{ updateAvailable ? (
					<SheetFooter className="mt-4 flex-col items-stretch gap-3">
						{ updateState?.status === 'downloading' ? (
							<div className="version-download-progress space-y-2">
								<Progress value={ updateState.downloadProgress ?? 0 } />
								<span><I18n>Downloading update</I18n></span>
							</div>
						) : null }
						{ updateState?.status === 'downloaded' ? (
							<Alert>
								<AlertDescription><I18n>Update downloaded. Restart to install.</I18n></AlertDescription>
							</Alert>
						) : null }
						{ updateState?.error ? (
							<Alert variant="destructive">
								<AlertDescription>{ updateState.error }</AlertDescription>
							</Alert>
						) : null }
						<Button
							className="w-full"
							loading={ updating || updateState?.status === 'downloading' }
							onClick={ () => void onDownloadUpdate() }
						>
							{ updateState?.status === 'downloaded'
								? <I18n>Restart to Install</I18n>
								: <I18n>Download Update</I18n> }
						</Button>
					</SheetFooter>
				) : null }
			</SheetContent>
		</Sheet>
	</div>;
} );

const ChangelogBlock = reaxper( ( {
	version ,
	body ,
	translated ,
	error ,
	loading ,
	onRefresh ,
	emptyHint ,
} : {
	version : string;
	body : string | null | undefined;
	translated? : boolean;
	error? : string | null;
	loading : boolean;
	onRefresh : () => void;
	emptyHint : React.ReactNode;
} ) => {
	const refreshButton = (
		<Button
			className="version-changelog__refresh"
			variant="ghost"
			size="sm"
			loading={ loading }
			onClick={ onRefresh }
		>
			<RefreshCw className="h-3.5 w-3.5" />
			<I18n>Refresh</I18n>
		</Button>
	);

	if( loading && body == null && !error ) {
		return <div className="version-changelog-loading"><Spinner /></div>;
	}
	return <div className="version-changelog">
		<div className="version-changelog__meta">
			<span className="version-changelog__label"><I18n>Version</I18n></span>
			<span className="version-changelog__value">{ version }</span>
			{ translated ? (
				<span className="version-changelog__translated"><I18n>Translated by Google</I18n></span>
			) : null }
			{ refreshButton }
		</div>
		{ error ? (
			<Alert variant="destructive" className="mb-3">
				<div className="flex items-center justify-between gap-2">
					<AlertDescription>{ error }</AlertDescription>
					<Button
						size="sm"
						variant="link"
						loading={ loading }
						onClick={ onRefresh }
					>
						<I18n>Refresh</I18n>
					</Button>
				</div>
			</Alert>
		) : null }
		{ body ? (
			<div className="version-changelog__body about-changelog__body">
				<Markdown
					remarkPlugins={ [ remarkGfm ] }
					components={ changelogMarkdownComponents }
				>
					{ body }
				</Markdown>
			</div>
		) : (
			<div className="version-changelog__empty">{ emptyHint }</div>
		) }
	</div>;
} );

const changelogMarkdownComponents : Components = {
	a : ( { href , children , ...props } ) => (
		<a
			{ ...props }
			href={ href }
			target="_blank"
			rel="noopener noreferrer"
			onClick={ ( event ) => {
				if( !href ) return;
				event.preventDefault();
				void api.openExternalUrl( href ).then( ( result ) => {
					if( !result.success ) {
						toast.error( result.error || i18n( 'Failed to open link' ) );
					}
				} );
			} }
		>
			{ children }
		</a>
	) ,
};

const FEATURES = [
	{
		icon : <Network /> ,
		title : 'Run multiple AIs side by side' ,
		desc : 'Each AI keeps its own login and data — no account mixing' ,
	} ,
	{
		icon : <Globe /> ,
		title : 'Built-in providers, or any webpage' ,
		desc : 'ChatGPT, Claude, Gemini, DeepSeek and more — or paste any AI site URL' ,
	} ,
	{
		icon : <FileText /> ,
		title : 'Reusable prompt drawers' ,
		desc : 'Left and right prompt panels stay with you as you switch AIs' ,
	} ,
	{
		icon : <ShieldCheck /> ,
		title : 'Smart per-AI proxy' ,
		desc : 'Global proxy plus per-AI exits. Unreachable proxies never silently fall back to direct' ,
	} ,
	{
		icon : <Monitor /> ,
		title : 'Desktop-first workflow' ,
		desc : 'Hotkeys, system tray, light/dark theme, and multi-language UI' ,
	} ,
] as const;

const CHATAIO_RELEASES_URL = 'https://github.com/Kane-Kuroneko/ChatAIO-Releases';


import { formatChatAioBuildSubtitle , formatChatAioVersionLabel } from '#shared/build-identity.utility';
import { reaxel_SettingsView } from '#SettingsView/reaxels/settings-view';
import { reaxel_I18n } from '#SettingsView/reaxels/i18n';
import { I18n , i18n } from '#SettingsView/reaxels/exports';
import type { AppUpdater } from '#src/Types/AppUpdater';
import appIconProd from '../../../../../statics/icons/app-icon.png';
import appIconDev from '../../../../../statics/icons/app-icon-dev.png';
import { Alert , AlertDescription } from '#Views/shared/ui/alert';
import { Button } from '#Views/shared/ui/button';
import { Progress } from '#Views/shared/ui/progress';
import {
	Sheet ,
	SheetContent ,
	SheetFooter ,
	SheetHeader ,
	SheetTitle,
} from '#Views/shared/ui/sheet';
import { Spinner } from '#Views/shared/ui/spinner';
import {
	Tabs ,
	TabsContent ,
	TabsList ,
	TabsTrigger,
} from '#Views/shared/ui/tabs';
import { toast } from '#Views/shared/ui/toast';
import { SimpleTooltip } from '#Views/shared/ui/tooltip';
import {
	ChevronRight ,
	Copy ,
	FileText ,
	Github ,
	Globe ,
	History ,
	Monitor ,
	Network ,
	RefreshCw ,
	ShieldCheck,
} from 'lucide-react';
import Markdown , { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { reaxper } from 'reaxes-react';
import './index.less';

const appIconUrl = __DEV__ ? appIconDev : appIconProd;
