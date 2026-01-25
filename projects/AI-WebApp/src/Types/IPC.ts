export interface RendererToMainEvent extends Record<string , IpcStructure.RendererToMainEvent<any[] , any[]>> {
	'1' : IpcStructure.RendererToMainEvent<[null] , [void]>;
	'2' : IpcStructure.RendererToMainEvent<[{ }], [void]>
}
export interface MainToRendererEvent extends Record<string , IpcStructure.MainToRendererEvent<any[] , any[]>> {
	'1' : IpcStructure.MainToRendererEvent<[number,string] , [void]>;
	'2' : IpcStructure.MainToRendererEvent<[string,number], [ { a:1 }]>
}
export interface IpcRpc extends Record<string , IpcStructure.IpcRpc<any[] , any>>{
	'fetch-settings' : IpcStructure.IpcRpc<[void] , Settings>;
	'submit-settings' : IpcStructure.IpcRpc<[PatchPath<Settings>, PatchData<PatchPath<Settings>, Settings>], {success: boolean}>;
}


import { type Settings } from "#src/Types/SettingsTypes";
import { IpcStructure } from "#generic/toolkit/electron/IpcStructure";
import {
	PatchData ,
	PatchPath ,
} from "#src/Types/SettingsTypes/SettingsPatchPath";
