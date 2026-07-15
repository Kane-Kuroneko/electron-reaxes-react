export type MenubarErrorReport = {
	scope : string;
	message : string;
	stack? : string;
	context? : string;
	source : 'main' | 'main-view-renderer' | 'dropdown-view-renderer';
};

const LOG_FILE_NAME = 'menubar-errors.log';

const getLogFilePath = () => {
	return path.join( process.cwd() , 'logs' , LOG_FILE_NAME );
};

const ensureLogDir = () => {
	const logsDir = path.join( process.cwd() , 'logs' );
	if( !fs.existsSync( logsDir ) ) {
		fs.mkdirSync( logsDir , { recursive : true } );
	}
};

const formatReportLine = ( report : MenubarErrorReport ) => {
	const timestamp = new Date().toISOString();
	const context = report.context ? ` | context=${ report.context }` : '';
	const stack = report.stack ? `\n${ report.stack }` : '';
	return `[${ timestamp }] [${ report.source }] [${ report.scope }] ${ report.message }${ context }${ stack }\n`;
};

export const toMenubarErrorReport = (
	scope : string ,
	error : unknown ,
	options : {
		source : MenubarErrorReport['source'];
		context? : Record<string , unknown>;
	} ,
): MenubarErrorReport => {
	const context = options.context
		? JSON.stringify( options.context )
		: undefined;
	if( error instanceof Error ) {
		return {
			scope ,
			message : error.message ,
			stack : error.stack ,
			context ,
			source : options.source ,
		};
	}
	return {
		scope ,
		message : String( error ) ,
		context ,
		source : options.source ,
	};
};

export const logMenubarError = ( report : MenubarErrorReport ) => {
	const line = formatReportLine( report );
	console.error( `[Menubar] ${ report.scope }: ${ report.message }` , report.context || '' );
	if( report.stack ) {
		console.error( report.stack );
	}
	try {
		ensureLogDir();
		fs.appendFileSync( getLogFilePath() , line , 'utf8' );
	} catch ( writeError ) {
		console.error( '[Menubar] Failed to write menubar error log:' , writeError );
	}
};

export const getMenubarErrorLogPath = () => {
	return getLogFilePath();
};


import * as fs from 'node:fs';
import * as path from 'node:path';
