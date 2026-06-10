export const createDevRendererEntryURL = (
	entry:AIWebAppRendererEntryName ,
	query:RendererEntryQuery = {},
) => {
	const url = new URL( `https://localhost:${ __DEV_PORT__ }/${ entry }/` );
	url.searchParams.set( 't' , Date.now().toString() );
	Object.entries( query ).forEach( ( [ key , value ] ) => {
		if( value === null || typeof value === 'undefined' ) {
			return;
		}
		url.searchParams.set( key , String( value ) );
	} );
	return url.toString();
};

export const getRendererEntryFilePath = (
	absAppRunningPath:string ,
	entry:AIWebAppRendererEntryName,
) => {
	return path.join( absAppRunningPath , 'renderer' , entry , 'index.html' );
};

export const getFreshRendererLoadURLOptions = (url:string) => {
	if( !dev() || !url.startsWith( `https://localhost:${ __DEV_PORT__ }/` ) ) {
		return undefined;
	}
	return {
		extraHeaders : [
			'Cache-Control: no-cache',
			'Pragma: no-cache',
		].join( '\n' ),
	};
};

type RendererEntryQuery = Record<string , string | number | boolean | null | undefined>;

import type { AIWebAppRendererEntryName } from '#src/shared/renderer-entries';
import { dev } from 'electron-is';
import * as path from 'node:path';
