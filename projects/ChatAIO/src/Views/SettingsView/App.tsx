const SETTINGS_MENU_PANELS = {
	general : RCGeneralPanel ,
	net : RCNetworkPanel ,
	mngeai : RCManageAIsPanel ,
	about : RCAboutPanel ,
} as const;

const SETTINGS_MENU_ORDER = [ 'general' , 'net' , 'mngeai' , 'about' ] as const;

export const App = reaxper( () => {
	const store = reaxel_SettingsView.store.RootMenu;
	const setState = reaxel_SettingsView.setState.RootMenu;
	const resolvedTheme = resolveThemePreference(
		reaxel_SettingsView.store.UIControls.appearance.theme ,
		reaxel_SettingsView.store.Environment.systemTheme,
	);
	
	const { applySettings , exitSettings , exitWithoutSave , reloadRuntimeSettings , isDirty } = reaxel_SettingsView();
	const catalogUpdate = reaxel_SettingsView.store.UIControls.manage_AIs.catalog_update;
	/* 只在预览/applying 时锁 chrome；checking 不锁。见 docs/features/ai-catalog-manual-update.md */
	const catalogChromeLocked = shouldLockSettingsChromeForCatalogUpdate( catalogUpdate );

	/*
	 * 切过的页留在树上藏起来，不要每次卸掉重挂。
	 * Manage AIs 的表格 + DnD 重挂载会卡一下；切 tab 也不拉目录更新。
	 */
	const visitedMenusRef = useRef( new Set<keyof typeof SETTINGS_MENU_PANELS>( [ store.current as keyof typeof SETTINGS_MENU_PANELS ] ) );
	if( store.current in SETTINGS_MENU_PANELS ) {
		visitedMenusRef.current.add( store.current as keyof typeof SETTINGS_MENU_PANELS );
	}

	const { markMenuSelect , measureDirty } = useSettingsMenuPerf( store.current );

	// 触发响应式依赖收集 - 让按钮状态随 UIControls 变化而更新
	const dirty = measureDirty( () => isDirty() );
	
	return <ConfigProvider
		theme={ {
			algorithm : resolvedTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
		} }
		modal={ SETTINGS_MODAL_CONFIG }
	>
		<div className="settings-root" data-testid="settings-root">
			<div className="settings-body">
				<div className={ catalogChromeLocked ? 'settings-sider settings-sider--locked' : 'settings-sider' }>
					<Menu
						items={ store.menus.map( it => {
							return {
								...it ,
								key : it.value,
								label: <I18n>{it.label}</I18n>,
							};
						} ) }
						onSelect={ ( { key } ) => {
							if( catalogChromeLocked ) {
								return;
							}
							const next = key as keyof typeof SETTINGS_MENU_PANELS;
							if( next in SETTINGS_MENU_PANELS ) {
								markMenuSelect( {
									from : store.current ,
									to : next ,
									firstVisit : !visitedMenusRef.current.has( next ) ,
									aiCount : reaxel_SettingsView.store.Data.AIs.length ,
								} );
							}
							setState( { current : key as any } );
							if( key !== 'about' ) {
								reaxel_SettingsView.setState.VersionUI( { drawerOpen : false } );
							}
						} }
						selectedKeys={ [ store.current ] }
					/>
				</div>
				<div className="settings-content">
					{ SETTINGS_MENU_ORDER.filter( key => visitedMenusRef.current.has( key ) ).map( key => {
						const Panel = SETTINGS_MENU_PANELS[key];
						const active = store.current === key;
						return <div
							key={ key }
							className={ [
								'settings-panel' ,
								SETTINGS_FILL_CONTENT_MENUS.has( key ) ? 'settings-panel--fill' : '' ,
								active ? '' : 'settings-panel--inactive' ,
							].filter( Boolean ).join( ' ' ) }
							aria-hidden={ !active }
						>
							<Panel />
						</div>;
					} ) }
				</div>
			</div>
			<div className="settings-footer">
				{ __DEV__ && <LongPressButton
					danger
					onConfirm={ async() => {
						const result = await devCleanStart();
						if( !result.success ) {
							message.error( result.error || 'Clean start failed' );
						}
					} }
				><I18n>Clean Start</I18n></LongPressButton> }
				<Button
					type="dashed"
					disabled={ !dirty || catalogChromeLocked }
					onClick={ async() => {
						await reloadRuntimeSettings();
					} }
				><I18n>Discard Changes</I18n></Button>

				<Button
					danger
					disabled={ catalogChromeLocked }
					onClick={ async() => {
						await exitWithoutSave();
					} }
				><I18n>Exit Without Save</I18n></Button>

				{ /* E2E：data-dirty 是 isDirty() 的 DOM 镜像，Apply disabled 还可能是目录锁。见 docs/features/e2e-playwright.md */ }
				<Button
					data-testid="settings-footer-apply"
					data-dirty={ dirty ? 'true' : 'false' }
					disabled={ !dirty || catalogChromeLocked }
					onClick={ async() => {
						const result = await applySettings();
						showApplyResult( result );
					} }
				><I18n>Apply</I18n></Button>

				<Button
					type="primary"
					disabled={ !dirty || catalogChromeLocked }
					onClick={ async() => {
						const result = await applySettings();
						showApplyResult( result );
						if( result.success ) {
							exitSettings();
						}
					} }
				><I18n>Save & Exit</I18n></Button>
			</div>
		</div>
	</ConfigProvider>;
} );

const LongPressButton = (props:any) => {
	const {
		onConfirm ,
		...buttonProps
	} = props;
	const [ holding , setHolding ] = useState( false );
	const [ progress , setProgress ] = useState( 0 );
	const timerRef = useRef<ReturnType<typeof setInterval>>( null );
	const startedAt = useRef( 0 );
	const holdMs = 900;

	const stop = () => {
		if( timerRef.current ) {
			clearInterval( timerRef.current );
			timerRef.current = null;
		}
		setHolding( false );
		setProgress( 0 );
	};

	const start = () => {
		if( buttonProps.loading || timerRef.current ) return;
		startedAt.current = Date.now();
		setHolding( true );
		timerRef.current = setInterval( () => {
			const nextProgress = Math.min( 1 , ( Date.now() - startedAt.current ) / holdMs );
			setProgress( nextProgress );
			if( nextProgress >= 1 ) {
				stop();
				onConfirm?.();
			}
		} , 16 );
	};

	return <Button
		{ ...buttonProps }
		onMouseDown={ start }
		onMouseUp={ stop }
		onMouseLeave={ stop }
		onTouchStart={ start }
		onTouchEnd={ stop }
		className={ `${ buttonProps.className || '' } long-press-button ${ holding ? 'is-holding' : '' }` }
		style={ {
			...buttonProps.style ,
			'--hold-progress' : progress,
		} as any }
	/>;
};

const showApplyResult = (result:SettingsApplyResult) => {
	if( !result.success ) {
		message.error( result.error || 'Failed to apply settings' );
		return;
	}
	if( result.restartRequired ) {
		Modal.warning( {
			title : <I18n>Restart required</I18n> ,
			content : <div>
				<div><I18n>Settings were saved. These changes require restarting the app:</I18n></div>
				<ul>
					{ result.restartReasons.map( reason => <li key={ reason }>{ reason }</li> ) }
				</ul>
			</div>,
		} );
		return;
	}
	message.success( i18n('Settings applied') );
};

import { RCGeneralPanel } from '#SettingsView/components/General';
import { RCAboutPanel } from '#SettingsView/components/About';
import { RCManageAIsPanel } from '#SettingsView/components/ManageAIs';
import { RCNetworkPanel } from '#SettingsView/components/Network';
import {
	SETTINGS_FILL_CONTENT_MENUS ,
	SETTINGS_MODAL_CONFIG ,
} from '#SettingsView/layout/constants';
import { useSettingsMenuPerf } from '#SettingsView/layout/use-settings-menu-perf';
import { shouldLockSettingsChromeForCatalogUpdate } from '#shared/utils/catalog-update-inflight.utility';
import { devCleanStart } from '#SettingsView/services/Settings';
import { resolveThemePreference } from '#shared/appearance';
import { reaxel_SettingsView } from "#SettingsView/reaxels/settings-view";
import type { SettingsApplyResult } from "#src/Types/SettingsTypes";
import {
	Button ,
	ConfigProvider ,
	Menu ,
	message ,
	Modal,
	theme as antdTheme,
} from 'antd';
import { reaxper  } from 'reaxes-react';
import './index.less';
