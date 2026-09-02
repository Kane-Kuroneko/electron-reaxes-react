/**
 * 读取 menubar-cold-start.jsonl，打印最后一条 verdict。
 *
 * 用法（仓库根）：
 *   yarn --cwd projects/ChatAIO analyze:menubar-boot
 *   yarn --cwd projects/ChatAIO analyze:menubar-boot -- path/to/menubar-cold-start.jsonl
 */

const readEvents = ( filePath : string ) : MenubarBootLogEvent[] => {
	if( !fs.existsSync( filePath ) ) {
		throw new Error( `log not found: ${ filePath }` );
	}
	const lines = fs.readFileSync( filePath , 'utf8' ).split( /\r?\n/ ).filter( Boolean );
	const events : MenubarBootLogEvent[] = [];
	for( const line of lines ) {
		try {
			events.push( JSON.parse( line ) as MenubarBootLogEvent );
		} catch { /* 跳过坏行 */ }
	}
	return events;
};

const defaultLogPath = () => {
	const fileName = 'menubar-cold-start.jsonl';
	// Electron unpackaged 写 cwd/logs；分析脚本从仓库根跑，cwd 往往不是子工程。
	const candidates = [
		path.resolve( process.cwd() , 'logs' , fileName ) ,
		path.resolve( process.cwd() , 'projects' , 'ChatAIO' , 'logs' , fileName ) ,
		path.resolve( __dirname , '..' , 'logs' , fileName ) ,
	];
	const existing = candidates.find( candidate => fs.existsSync( candidate ) );
	return existing || candidates[0];
};

const main = () => {
	const argPath = process.argv.slice( 2 ).find( arg => arg !== '--' );
	const filePath = argPath || defaultLogPath();
	const events = readEvents( filePath );
	const stored = [ ...events ].reverse().find( event => event.type === 'verdict' );
	const verdict = stored?.detail
		? stored.detail
		: computeMenubarColdStartVerdict( events );
	console.log( JSON.stringify( {
		filePath ,
		eventCount : events.length ,
		verdict ,
	} , null , 2 ) );
};

main();


import {
	computeMenubarColdStartVerdict ,
	type MenubarBootLogEvent,
} from '#shared/menubar-cold-start-monitor';
import * as fs from 'node:fs';
import * as path from 'node:path';
