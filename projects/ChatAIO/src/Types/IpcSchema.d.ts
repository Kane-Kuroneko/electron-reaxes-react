export interface RendererToMainEvents extends Record<string , IpcStructure.RendererToMainEvent<unknown[] , {channel:unknown,args:unknown[]}>> {
	'1' : IpcStructure.RendererToMainEvent<[null] , MainToRendererReply<'1'>>;
	'exit-settings' : IpcStructure.RendererToMainEvent<[void] , {channel:void,args:void[]}>;
	'update-preload-ai-config' : IpcStructure.RendererToMainEvent<[string[]] , {channel:void,args:void[]}>;
	'language-change' : IpcStructure.RendererToMainEvent<[language: string] , {channel:void,args:void[]}>;
	'turn-to-next-ai-page' : IpcStructure.RendererToMainEvent<[void] , {channel:void,args:void[]}>;
	'turn-to-previous-ai-page' : IpcStructure.RendererToMainEvent<[void] , {channel:void,args:void[]}>;
	'prompt-view-appearance-preview-change' : IpcStructure.RendererToMainEvent<[appearance: PromptView.Appearance] , {channel:void,args:void[]}>;
	'close-prompt-view' : IpcStructure.RendererToMainEvent<[side: PromptView.Side] , {channel:void,args:void[]}>;
	'perf-event' : IpcStructure.RendererToMainEvent<[events: import('#shared/utils/switch-perf-recorder.utility').PerfEvent[]] , {channel:void,args:void[]}>;
	'focus-state-change' : IpcStructure.RendererToMainEvent<[import('#src/Types/FocusMonitor').FocusMonitor.FocusState] , {channel:void,args:void[]}>;
	'menu-view:action' : IpcStructure.RendererToMainEvent<[MenuView.Action] , {channel:void,args:void[]}>;
	'menu-view:ready' : IpcStructure.RendererToMainEvent<[void] , {channel:void,args:void[]}>;
	'menu-view:visual-ready' : IpcStructure.RendererToMainEvent<[MenubarVisualReadyPayload] , {channel:void,args:void[]}>;
	'menu-view:resize' : IpcStructure.RendererToMainEvent<[height: number] , {channel:void,args:void[]}>;
	'dropdown-view:open' : IpcStructure.RendererToMainEvent<[MainView.DropdownRequest] , {channel:void,args:void[]}>;
	'dropdown-view:close' : IpcStructure.RendererToMainEvent<[void] , {channel:void,args:void[]}>;
	'dropdown-view:focus-item' : IpcStructure.RendererToMainEvent<[index: number] , {channel:void,args:void[]}>;
	'menubar:error-report' : IpcStructure.RendererToMainEvent<[MenubarErrorReport] , {channel:void,args:void[]}>;
	'menubar:boot-probe' : IpcStructure.RendererToMainEvent<[MenubarBootProbePayload] , {channel:void,args:void[]}>;
	'open-settings-version' : IpcStructure.RendererToMainEvent<[versionTab?: AppUpdater.VersionTab] , {channel:void,args:void[]}>;
}

export interface MainToRendererEvents extends Record<string , IpcStructure.MainToRendererEvent<unknown[]>> {
	'1' : IpcStructure.MainToRendererEvent<[number,string]>;
	'2' : IpcStructure.MainToRendererEvent<[string,number]>;
	'floating-view-command' : IpcStructure.MainToRendererEvent<[FloatingView.Command]>;
	'ai-page-environment-change' : IpcStructure.MainToRendererEvent<[AIPageEnvironment]>;
	'prompt-view-appearance-change' : IpcStructure.MainToRendererEvent<[PromptView.AppearanceState]>;
	'menu-view:command' : IpcStructure.MainToRendererEvent<[MenuView.MenuCommand]>;
	'dropdown-view:command' : IpcStructure.MainToRendererEvent<[DropdownView.Command]>;
	'update-state-changed' : IpcStructure.MainToRendererEvent<[AppUpdater.State]>;
	'settings-view:navigate' : IpcStructure.MainToRendererEvent<[AppUpdater.NavigatePayload]>;
	'ais-order-changed' : IpcStructure.MainToRendererEvent<[enabledIds: string[]]>;
}

export interface IpcSyncRpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>> {
	'get-ai-page-environment': IpcStructure.IpcRpc<[void], AIPageEnvironment | null>;
	'dropdown-view:is-visible': IpcStructure.IpcRpc<[void], boolean>;
}

export interface IpcRpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>>{
	'fetch-settings' : IpcStructure.IpcRpc<[void] , SettingsFetchResult>;
	'apply-settings' : IpcStructure.IpcRpc<[settings: Settings], SettingsApplyResult>;
	'submit-settings' : IpcStructure.IpcRpc<[path: PatchPath<Settings>, data: PatchData<PatchPath<Settings>, Settings>], {success: boolean, error?: string}>;

	// AI Configuration Management RPCs
	'get-ais': IpcStructure.IpcRpc<[void], AI.AIItem[]>;
	/* 映射后的默认页实例，不是供应商目录原样。见 docs/feature-proposal--ai-catalog-source.md */
	'get-default-ais': IpcStructure.IpcRpc<[void], AI.AIItem[]>;
	'update-ai': IpcStructure.IpcRpc<[id: string, updates: Partial<AI.AIItem>], AI.AIItem | null>;
	'add-ai': IpcStructure.IpcRpc<[ai: Omit<AI.AIItem, 'id'> & { id?: string }], AI.AIItem>;
	'delete-ai': IpcStructure.IpcRpc<[id: string], boolean>;
	'reorder-ais': IpcStructure.IpcRpc<[enabledIds: string[]], { success: boolean, error?: string }>; /* 全表 id 或 enabled-only id，见 docs/features/ai-list-reorder.md */
	'reset-ais-to-defaults': IpcStructure.IpcRpc<[void], { success: boolean, error?: string }>;
	/* 供应商目录手动更新：只读 check 不写盘；apply 的 revision 必须对得上这次 check。见 docs/features/ai-catalog-manual-update.md */
	'check-ai-catalog-update': IpcStructure.IpcRpc<[void], AICatalog.CatalogUpdateCheckResult>;
	'apply-ai-catalog-update': IpcStructure.IpcRpc<[revision: number], AICatalog.CatalogUpdateApplyResult & { settings?: Settings }>;
	'discard-ai-catalog-update': IpcStructure.IpcRpc<[void], { success: boolean }>;
	'relaunch-app': IpcStructure.IpcRpc<[void], { success: boolean }>;
	'get-preload-ai-families': IpcStructure.IpcRpc<[void], string[]>; /* 返回预加载 AI 的 ID 列表而非 family 列表 */
	'get-appearance-environment': IpcStructure.IpcRpc<[void], AppearanceEnvironment>;
	'set-startup-ai-page-load-mode': IpcStructure.IpcRpc<[mode: Startup.AIPageLoadMode], SettingsApplyResult>;
	'test-proxy-server': IpcStructure.IpcRpc<[proxyConf: NetworkProxy.ProxyConfFields, url: string], NetworkProxy.ProxyTestResult>;
	'get-guiding-defaults': IpcStructure.IpcRpc<[void], Guiding.Defaults>;
	'guiding-save-progress': IpcStructure.IpcRpc<[progress: Guiding.Progress], { success: boolean }>;
	'guiding-test-connectivity': IpcStructure.IpcRpc<[void], Guiding.ConnectivityResult>;
	'guiding-finish': IpcStructure.IpcRpc<[options: Guiding.FinishOptions], { success: boolean }>;
	'dev-clean-start': IpcStructure.IpcRpc<[void], DevCleanStartResult>;
	'get-prompt-view-state': IpcStructure.IpcRpc<[side: PromptView.Side], PromptView.State>;
	'save-prompt-view-items': IpcStructure.IpcRpc<[side: PromptView.Side, items: PromptView.Item[]], PromptView.SaveResult>;
	'copy-prompt-view-text': IpcStructure.IpcRpc<[text: string], PromptView.CopyResult>;
	'get-app-version': IpcStructure.IpcRpc<[void], string>;
	'get-update-state': IpcStructure.IpcRpc<[void], AppUpdater.State>;
	'check-for-updates': IpcStructure.IpcRpc<[void], AppUpdater.State>;
	'fetch-version-changelogs': IpcStructure.IpcRpc<[language?: Languages], AppUpdater.Changelogs>;
	'download-and-install-update': IpcStructure.IpcRpc<[void], AppUpdater.DownloadResult>;
	'open-external-url': IpcStructure.IpcRpc<[url: string], { success: boolean; error?: string }>;
}

type MainToRendererReply<K extends keyof MainToRendererEvents> = ReplyFromMtrEvents<MainToRendererEvents , K>;
type AppearanceEnvironment = {
	systemLanguage: Languages;
	systemTheme: 'light' | 'dark';
	systemLanguageName: string;
};
type DevCleanStartResult = {
	success: boolean;
	userDataPath: string;
	error?: string;
};

import {
	type Settings ,
	type SettingsApplyResult ,
	type SettingsFetchResult ,
} from "#src/Types/SettingsTypes";

import type { IpcStructure,ReplyFromMtrEvents } from "#generics/toolkit/electron/IpcStructure";
import {
	PatchData ,
	PatchPath ,
} from "#src/Types/SettingsTypes/SettingsPatchPath";
import { AI } from "#src/Types/SettingsTypes/AI";
import type { AICatalog } from "#src/Types/AICatalog";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import type { Startup } from "#src/Types/SettingsTypes/Startup";
import type { FloatingView } from "#src/Types/FloatingView";
import type { Languages } from '#src/Types/Languages';
import type { Guiding } from '#src/Types/Guiding';
import type { AIPageEnvironment } from '#src/Types/AIPageEnvironment';
import type { PromptView } from '#src/Types/PromptView';
import type { MenubarErrorReport } from '#main/services/menubar-error-log.utility';
import type { MenubarBootProbePayload , MenubarVisualReadyPayload } from '#shared/menubar-cold-start-monitor';
import type { MenuView , MainView } from '#src/Types/MenuView';
import type { DropdownView } from '#src/Types/DropdownView';
import type { AppUpdater } from '#src/Types/AppUpdater';
