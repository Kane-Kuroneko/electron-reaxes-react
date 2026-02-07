export interface RendererToMainEvents extends Record<string , IpcStructure.RendererToMainEvent<unknown[] , {channel:unknown,args:unknown[]}>> {
	'1' : IpcStructure.RendererToMainEvent<[null] , MainToRendererReply<'1'>>;
	'exit-settings' : IpcStructure.RendererToMainEvent<[void] , {channel:void,args:void[]}>;
}
export interface MainToRendererEvents extends Record<string , IpcStructure.MainToRendererEvent<unknown[]>> {
	'1' : IpcStructure.MainToRendererEvent<[number,string]>;
	'2' : IpcStructure.MainToRendererEvent<[string,number]>
}
export interface IpcRpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>>{
	'fetch-settings' : IpcStructure.IpcRpc<[void] , Settings>;
	'submit-settings' : IpcStructure.IpcRpc<[PatchPath<Settings>, PatchData<PatchPath<Settings>, Settings>], {success: boolean}>;
}

type MainToRendererReply<K extends keyof MainToRendererEvents> = ReplyFromMtrEvents<MainToRendererEvents , K>;

import { type Settings } from "#src/Types/SettingsTypes";
import type { IpcStructure,ReplyFromMtrEvents } from "#generics/toolkit/electron/IpcStructure";
import {
	PatchData ,
	PatchPath ,
} from "#src/Types/SettingsTypes/SettingsPatchPath";
