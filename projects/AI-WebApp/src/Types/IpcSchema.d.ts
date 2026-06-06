export interface RendererToMainEvents extends Record<string , IpcStructure.RendererToMainEvent<unknown[] , {channel:unknown,args:unknown[]}>> {
	'1' : IpcStructure.RendererToMainEvent<[null] , MainToRendererReply<'1'>>;
	'exit-settings' : IpcStructure.RendererToMainEvent<[void] , {channel:void,args:void[]}>;
	'update-preload-ai-config' : IpcStructure.RendererToMainEvent<[string[]] , {channel:void,args:void[]}>;
	'language-change' : IpcStructure.RendererToMainEvent<[language: string] , {channel:void,args:void[]}>;
	'turn-to-next-ai-page' : IpcStructure.RendererToMainEvent<[void] , {channel:void,args:void[]}>;
	'turn-to-previous-ai-page' : IpcStructure.RendererToMainEvent<[void] , {channel:void,args:void[]}>;
}

export interface MainToRendererEvents extends Record<string , IpcStructure.MainToRendererEvent<unknown[]>> {
	'1' : IpcStructure.MainToRendererEvent<[number,string]>;
	'2' : IpcStructure.MainToRendererEvent<[string,number]>;
	'floating-layer-command' : IpcStructure.MainToRendererEvent<[FloatingLayer.Command]>;
}
export interface IpcRpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>>{
	'fetch-settings' : IpcStructure.IpcRpc<[void] , SettingsFetchResult>;
	'apply-settings' : IpcStructure.IpcRpc<[settings: Settings], SettingsApplyResult>;
	'submit-settings' : IpcStructure.IpcRpc<[path: PatchPath<Settings>, data: PatchData<PatchPath<Settings>, Settings>], {success: boolean, error?: string}>;
	
	// AI Configuration Management RPCs
	'get-ais': IpcStructure.IpcRpc<[void], AI.AIItem[]>;
	'get-default-ais': IpcStructure.IpcRpc<[void], AI.AIItem[]>;
	'update-ai': IpcStructure.IpcRpc<[id: string, updates: Partial<AI.AIItem>], AI.AIItem | null>;
	'add-ai': IpcStructure.IpcRpc<[ai: Omit<AI.AIItem, 'id'> & { id?: string }], AI.AIItem>;
	'delete-ai': IpcStructure.IpcRpc<[id: string], boolean>;
	'reset-ais-to-defaults': IpcStructure.IpcRpc<[void], { success: boolean }>;
	'get-preload-ai-families': IpcStructure.IpcRpc<[void], AI.AIFamily[]>;
	'get-appearance-environment': IpcStructure.IpcRpc<[void], AppearanceEnvironment>;
	'set-startup-ai-page-load-mode': IpcStructure.IpcRpc<[mode: Startup.AIPageLoadMode], SettingsApplyResult>;
	'test-proxy-server': IpcStructure.IpcRpc<[proxyConf: NetworkProxy.ProxyConfFields, url: string], NetworkProxy.ProxyTestResult>;
	'get-guiding-defaults': IpcStructure.IpcRpc<[void], Guiding.Defaults>;
	'guiding-save-progress': IpcStructure.IpcRpc<[progress: Guiding.Progress], { success: boolean }>;
	'guiding-test-connectivity': IpcStructure.IpcRpc<[void], Guiding.ConnectivityResult>;
	'guiding-finish': IpcStructure.IpcRpc<[options: Guiding.FinishOptions], { success: boolean }>;
	'dev-clean-start': IpcStructure.IpcRpc<[void], DevCleanStartResult>;
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
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import type { Startup } from "#src/Types/SettingsTypes/Startup";
import type { FloatingLayer } from "#src/Types/FloatingLayer";
import type { Languages } from '#src/Types/Languages';
import type { Guiding } from '#src/Types/Guiding';
