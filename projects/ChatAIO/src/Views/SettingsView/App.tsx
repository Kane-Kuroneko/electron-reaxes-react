const SETTINGS_MENU_PANELS = {
	general : RCGeneralPanel ,
	net : RCNetworkPanel ,
	mngeai : RCManageAIsPanel ,
	about : RCAboutPanel ,
} as const;

const SETTINGS_MENU_ORDER = [ 'general' , 'net' , 'mngeai' , 'about' ] as const;

const SETTINGS_MENU_ICONS = {
	general : SlidersHorizontal ,
	net : Globe ,
	mngeai : LayoutGrid ,
	about : Info ,
} as const;

/**
 * Settings 壳：左侧导航 + 面板 keep-alive + 收缩页脚。
 * 运行设置即时写盘；AI 表草稿只走 Manage AIs 表底。见 docs/features/settings-ui-shadcn.md
 */
export const App = reaxper( () => {
	const store = reaxel_SettingsView.store.RootMenu;
	const setState = reaxel_SettingsView.setState.RootMenu;
	const runtimeUI = reaxel_SettingsView.store.RuntimeUI;
	const resolvedTheme = resolveThemePreference(
		reaxel_SettingsView.store.UIControls.appearance.theme ,
		reaxel_SettingsView.store.Environment.systemTheme,
	);

	const {
		exitSettings ,
		dismissRestartRequired ,
		isAIsDirty,
	} = reaxel_SettingsView();
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

	const { markMenuSelect } = useSettingsMenuPerf( store.current );
	const aisDirty = isAIsDirty();

	return <TooltipProvider delayDuration={ 400 }>
		<div
			className="settings-root flex h-screen flex-row overflow-hidden bg-background text-foreground"
			data-testid="settings-root"
			data-theme={ resolvedTheme }
		>
			<aside className={ cn(
				'flex w-[220px] shrink-0 flex-col border-r border-border bg-card/80 px-3 py-5' ,
				catalogChromeLocked && 'pointer-events-none opacity-55',
			) }>
				<div className="mb-5 px-2">
					<div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">ChatAIO</div>
					<div className="mt-1 text-base font-semibold"><I18n>Settings</I18n></div>
				</div>
				<nav className="flex flex-col gap-1">
					{ store.menus.map( item => {
						const key = item.value as keyof typeof SETTINGS_MENU_PANELS;
						const Icon = SETTINGS_MENU_ICONS[key] || SlidersHorizontal;
						const active = store.current === item.value;
						return <button
							key={ item.value }
							type="button"
							role="menuitem"
							className={ cn(
								'flex w-full items-center justify-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors' ,
								active
									? 'bg-foreground/[0.06] text-foreground'
									: 'text-muted-foreground hover:bg-accent hover:text-foreground',
							) }
							onClick={ () => {
								if( catalogChromeLocked ) return;
								const next = key;
								if( next in SETTINGS_MENU_PANELS ) {
									markMenuSelect( {
										from : store.current ,
										to : next ,
										firstVisit : !visitedMenusRef.current.has( next ) ,
										aiCount : reaxel_SettingsView.store.Data.AIs.length ,
									} );
								}
								setState( { current : item.value as any } );
								if( item.value !== 'about' ) {
									reaxel_SettingsView.setState.VersionUI( { drawerOpen : false } );
								}
							} }
						>
							<Icon className="h-4 w-4 shrink-0" />
							<I18n>{ item.label }</I18n>
						</button>;
					} ) }
				</nav>
			</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="settings-content flex min-h-0 flex-1 flex-col overflow-hidden px-8 py-6">
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
				<footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-card/70 px-8 py-3">
					{ __DEV__ && <LongPressButton
						variant="destructive"
						onConfirm={ async() => {
							const result = await devCleanStart();
							if( !result.success ) {
								toast.error( result.error || 'Clean start failed' );
							}
						} }
					><I18n>Clean Start</I18n></LongPressButton> }
					{ aisDirty ? <span className="mr-auto text-xs text-muted-foreground">
						<I18n>Unsaved AI page changes stay until you save them in Manage AIs</I18n>
					</span> : null }
					<Button
						variant="outline"
						data-testid="settings-footer-done"
						disabled={ catalogChromeLocked }
						onClick={ () => exitSettings() }
					><I18n>Done</I18n></Button>
				</footer>
			</div>
			<Dialog
				open={ runtimeUI.restartRequiredOpen }
				onOpenChange={ ( open ) => {
					if( open === false ) dismissRestartRequired();
				} }
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle><I18n>Restart required</I18n></DialogTitle>
						<DialogDescription>
							<I18n>Settings were saved. These changes require restarting the app:</I18n>
						</DialogDescription>
					</DialogHeader>
					<ul className="list-disc space-y-1 pl-5 text-sm">
						{ runtimeUI.restartReasons.map( reason => <li key={ reason }>{ reason }</li> ) }
					</ul>
					<DialogFooter>
						<Button onClick={ () => dismissRestartRequired() }><I18n>OK</I18n></Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<AppToaster theme={ resolvedTheme } />
		</div>
	</TooltipProvider>;
} );

import { RCAboutPanel } from '#SettingsView/components/About';
import { RCGeneralPanel } from '#SettingsView/components/General';
import { RCManageAIsPanel } from '#SettingsView/components/ManageAIs';
import { RCNetworkPanel } from '#SettingsView/components/Network';
import { SETTINGS_FILL_CONTENT_MENUS } from '#SettingsView/layout/constants';
import { useSettingsMenuPerf } from '#SettingsView/layout/use-settings-menu-perf';
import { reaxel_SettingsView } from "#SettingsView/reaxels/settings-view";
import { devCleanStart } from '#SettingsView/services/Settings';
import { resolveThemePreference } from '#shared/appearance';
import { shouldLockSettingsChromeForCatalogUpdate } from '#shared/utils/catalog-update-inflight.utility';
import { Button } from '#Views/shared/ui/button';
import { cn } from '#Views/shared/ui/cn.utility';
import {
	Dialog ,
	DialogContent ,
	DialogDescription ,
	DialogFooter ,
	DialogHeader ,
	DialogTitle,
} from '#Views/shared/ui/dialog';
import { LongPressButton } from '#Views/shared/ui/long-press-button';
import { AppToaster } from '#Views/shared/ui/toast';
import { TooltipProvider } from '#Views/shared/ui/tooltip';
import {
	Globe ,
	Info ,
	LayoutGrid ,
	SlidersHorizontal,
} from 'lucide-react';
import { reaxper } from 'reaxes-react';
import '#Views/shared/ui/globals.css';
import './index.less';
