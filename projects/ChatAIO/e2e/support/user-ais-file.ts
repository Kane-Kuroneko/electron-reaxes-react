/**
 * 读隔离 userData 里的 user-ais.json。
 * 返回用户路径现在会 seed 这份文件；apply-settings 仍不得改它。
 */

export type UserAisFile = {
	ais : {
		id : string;
		label : string;
		disabled? : boolean;
		url? : string;
	}[];
	deletedIds? : string[];
};

export const userAisPath = ( userDataDir:string ) => {
	return path.join( userDataDir , 'user-ais.json' );
};

export const userAisFileExists = async( userDataDir:string ) => {
	try {
		await fs.access( userAisPath( userDataDir ) );
		return true;
	} catch {
		return false;
	}
};

export const readUserAisFile = async( userDataDir:string ) => {
	const raw = await fs.readFile( userAisPath( userDataDir ) , 'utf8' );
	return JSON.parse( raw ) as UserAisFile;
};

export const persistedIdsOf = ( file:UserAisFile ) => {
	return file.ais.map( ( ai ) => ai.id );
};

export const enabledIdsOf = ( file:UserAisFile ) => {
	return file.ais
		.filter( ( ai ) => ai.disabled !== true )
		.map( ( ai ) => ai.id );
};

import fs from 'node:fs/promises';
import path from 'node:path';
