export interface RendererToMainEvents extends Record<string , IpcStructure.RendererToMainEvent<unknown[] , {channel:unknown,args:unknown[]}>> {
	'1' : IpcStructure.RendererToMainEvent<[null] , MainToRendererReply<'1'>>;
	'exit-settings' : IpcStructure.RendererToMainEvent<[void] , {channel:void,args:void[]}>;
	'update-preload-ai-config' : IpcStructure.RendererToMainEvent<[string[]] , {channel:void,args:void[]}>;
}

export interface MainToRendererEvents extends Record<string , IpcStructure.MainToRendererEvent<unknown[]>> {
	'1' : IpcStructure.MainToRendererEvent<[number,string]>;
	'2' : IpcStructure.MainToRendererEvent<[string,number]>
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
}
type MainToRendererReply<K extends keyof MainToRendererEvents> = ReplyFromMtrEvents<MainToRendererEvents , K>;

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
