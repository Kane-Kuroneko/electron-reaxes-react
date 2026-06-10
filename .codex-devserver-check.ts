if( !webpack_conf_for_electron_renderer ) {
	throw new Error( 'renderer webpack config is missing' );
}

const compiler = webpack( webpack_conf_for_electron_renderer );
const firstDone = new Promise( ( resolve , reject ) => {
	compiler.hooks.done.tap( 'CodexDevServerCheck' , stats => {
		const json = stats.toJson( {
			all : false ,
			errors : true,
		} );
		if( stats.hasErrors() ) {
			reject( new Error( JSON.stringify( json.errors ) ) );
			return;
		}
		resolve( stats );
	} );
	compiler.hooks.failed.tap( 'CodexDevServerCheck' , reject );
} );

const server = new WebpackDevServer( webpack_conf_for_electron_renderer.devServer , compiler );
const devServerPort = Number( webpack_conf_for_electron_renderer.devServer?.port );

const get = (requestPath:string) => {
	return new Promise( ( resolve , reject ) => {
		const request = https.get( {
			hostname : 'localhost' ,
			port : devServerPort ,
			path : requestPath ,
			rejectUnauthorized : false,
		} , response => {
			let body = '';
			response.on( 'data' , chunk => body += chunk );
			response.on( 'end' , () => resolve( {
				status : response.statusCode ,
				hasRoot : body.includes( 'react-app-root' ) ,
				hasSettingsScript : body.includes( '/SettingsView/main.js' ) || body.includes( '../SettingsView/main.js' ) ,
				hasPromptScript : body.includes( '/PromptView/main.js' ) || body.includes( '../PromptView/main.js' ),
			} ) );
		} );
		request.on( 'error' , reject );
	} );
};

await server.start();
try {
	await firstDone;
	const results = [];
	for( const requestPath of [
		'/SettingsView/' ,
		'/SettingsView' ,
		'/PromptView/?side=left' ,
		'/renderer/index.html',
	] ) {
		results.push( {
			path : requestPath ,
			result : await get( requestPath ),
		} );
	}
	console.log( JSON.stringify( {
		port : devServerPort ,
		publicPath : webpack_conf_for_electron_renderer.output?.publicPath ,
		results,
	} , null , 3 ) );
} finally {
	await server.stop();
	await new Promise( resolve => compiler.close( () => resolve( null ) ) );
}

import { webpack_conf_for_electron_renderer } from './scripts/utils/mixedRepoWebpackConf.ts';
import WebpackDevServer from 'webpack-dev-server';
import webpack from 'webpack';
import https from 'node:https';
