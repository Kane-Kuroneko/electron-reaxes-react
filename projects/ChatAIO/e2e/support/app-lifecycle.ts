/**
 * 进程生命周期集成测试辅助：关用户窗后等 pid 树自己死；第二次启动用 spawn 而不是 _electron.launch。
 * 禁止走默认 fixture 的 closeChatAio（它会 app.exit + kill pid，僵尸永远绿）。
 * 清场只用 taskkill /T /F /PID <本次 pid>，禁止 /IM electron.exe 或 ChatAIO.exe。
 * 设计：docs/issues/close-without-tray-process-lingers.md 「怎么测」
 */

export type PidTreeRow = {
	pid : number;
	parentPid : number;
	name : string;
};

export const isPidAlive = ( pid:number ) : boolean => {
	try {
		process.kill( pid , 0 );
		return true;
	} catch {
		return false;
	}
};

export const waitForProcessExit = (
	child : Pick<ChildProcess , 'exitCode' | 'once' | 'off'> ,
	timeoutMs : number ,
	label : string,
) : Promise<number | null> => {
	if( child.exitCode !== null ) {
		return Promise.resolve( child.exitCode );
	}
	return new Promise( ( resolve , reject ) => {
		let settled = false;
		const onExit = ( code : number | null ) => {
			if( settled ) {
				return;
			}
			settled = true;
			clearTimeout( timer );
			resolve( code );
		};
		const timer = setTimeout( () => {
			if( settled ) {
				return;
			}
			settled = true;
			child.off( 'exit' , onExit );
			reject( new Error( `${ label } 在 ${ timeoutMs }ms 内没有退出（疑似僵尸进程）` ) );
		} , timeoutMs );
		child.once( 'exit' , onExit );
	} );
};

export const listPidTree = async( pid:number ) : Promise<PidTreeRow[]> => {
	if( process.platform === 'win32' ) {
		return listPidTreeWindows( pid );
	}
	return listPidTreePosix( pid );
};

export const assertPidTreeGone = async( pid:number ) => {
	await sleep( 400 );
	if( isPidAlive( pid ) ) {
		throw new Error( `主进程 pid=${ pid } 仍在（process.kill 0 未抛 ESRCH）` );
	}
	const tree = await listPidTree( pid );
	if( tree.length > 0 ) {
		const summary = tree.map( ( row ) => `${ row.name } pid=${ row.pid } ppid=${ row.parentPid }` ).join( ', ' );
		throw new Error( `主进程已退但进程树仍有残留：${ summary }` );
	}
};

/** 失败后的清理。禁止 /IM。 */
export const taskkillPidTree = async( pid:number ) => {
	if( isPidAlive( pid ) === false ) {
		return;
	}
	if( process.platform === 'win32' ) {
		await execFileAsync( 'taskkill' , [ '/T' , '/F' , '/PID' , String( pid ) ] ).catch( () => {} );
		return;
	}
	try {
		process.kill( pid , 'SIGKILL' );
	} catch {
		/* 已退出 */
	}
};

export const closeUserFacingBrowserWindow = async( electronApp:ElectronApplication ) => {
	/* Electron 没有 isSkipTaskbar()。用户窗 = 无 parent、非 alwaysOnTop。 */
	await electronApp.evaluate( ( { BrowserWindow } ) => {
		const win = BrowserWindow.getAllWindows().find( ( candidate ) => {
			if( candidate.isDestroyed() ) {
				return false;
			}
			if( candidate.getParentWindow() ) {
				return false;
			}
			if( candidate.isAlwaysOnTop() ) {
				return false;
			}
			return true;
		} );
		if( !win ) {
			throw new Error( 'no user-facing BrowserWindow to close' );
		}
		win.close();
	} );
};

export const readUserFacingWindowState = async( electronApp:ElectronApplication ) => {
	return electronApp.evaluate( ( { BrowserWindow } ) => {
		const win = BrowserWindow.getAllWindows().find( ( candidate ) => {
			if( candidate.isDestroyed() ) {
				return false;
			}
			if( candidate.getParentWindow() ) {
				return false;
			}
			if( candidate.isAlwaysOnTop() ) {
				return false;
			}
			return true;
		} );
		if( !win ) {
			return null;
		}
		return {
			visible : win.isVisible() ,
			minimized : win.isMinimized(),
		};
	} );
};

export const spawnSecondChatAioInstance = ( options:{
	userDataDir : string;
	paths : ChatAioE2EPaths;
} ) : ChildProcess => {
	const env : Record<string , string> = {};
	for( const [ key , value ] of Object.entries( process.env ) ) {
		if( typeof value === 'string' && key !== 'ELECTRON_RUN_AS_NODE' ) {
			env[key] = value;
		}
	}
	env.CHATAIO_E2E = '1';
	env.CHATAIO_E2E_USER_DATA_DIR = options.userDataDir;
	env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
	/* stdio 必须 ignore：pipe 不读会堵满缓冲区，第二实例还没 exit 就挂住。 */
	return spawn( options.paths.electronExecutable , [ options.paths.chatAioRoot ] , {
		cwd : options.paths.chatAioRoot ,
		env ,
		stdio : 'ignore',
	} );
};

export const removeUserDataDir = async( userDataDir:string ) => {
	await fs.promises.rm( userDataDir , {
		recursive : true ,
		force : true,
	} ).catch( () => {} );
};

const listPidTreeWindows = async( pid:number ) : Promise<PidTreeRow[]> => {
	const script = [
		`$pid = ${ pid }` ,
		'Get-CimInstance Win32_Process |' ,
		'Where-Object { $_.ProcessId -eq $pid -or $_.ParentProcessId -eq $pid } |' ,
		'Select-Object ProcessId,ParentProcessId,Name |' ,
		'ConvertTo-Json -Compress',
	].join( ' ' );
	const { stdout } = await execFileAsync( 'powershell.exe' , [
		'-NoProfile' ,
		'-NonInteractive' ,
		'-Command' ,
		script,
	] ).catch( () => ( { stdout : '' } ) );
	return parseCimProcessJson( stdout );
};

const listPidTreePosix = async( pid:number ) : Promise<PidTreeRow[]> => {
	const rows : PidTreeRow[] = [];
	if( isPidAlive( pid ) ) {
		rows.push( {
			pid ,
			parentPid : 0 ,
			name : 'electron',
		} );
	}
	const { stdout } = await execFileAsync( 'ps' , [ '-o' , 'pid=' , '--ppid' , String( pid ) ] ).catch( () => ( { stdout : '' } ) );
	for( const line of stdout.split( /\r?\n/ ) ) {
		const childPid = Number( line.trim() );
		if( Number.isInteger( childPid ) && childPid > 0 ) {
			rows.push( {
				pid : childPid ,
				parentPid : pid ,
				name : 'child',
			} );
		}
	}
	return rows;
};

const parseCimProcessJson = ( stdout:string ) : PidTreeRow[] => {
	const text = stdout.trim();
	if( text.length === 0 ) {
		return [];
	}
	let parsed : unknown;
	try {
		parsed = JSON.parse( text );
	} catch {
		return [];
	}
	const items = Array.isArray( parsed ) ? parsed : [ parsed ];
	return items.flatMap( ( item ) => {
		if( !item || typeof item !== 'object' ) {
			return [];
		}
		const row = item as {
			ProcessId? : number;
			ParentProcessId? : number;
			Name? : string;
		};
		if( typeof row.ProcessId !== 'number' ) {
			return [];
		}
		return [ {
			pid : row.ProcessId ,
			parentPid : typeof row.ParentProcessId === 'number' ? row.ParentProcessId : 0 ,
			name : typeof row.Name === 'string' ? row.Name : 'unknown',
		} ];
	} );
};

const execFileAsync = promisify( execFile );

import { sleep } from './app-probe';
import type { ChatAioE2EPaths } from './env';
import type { ElectronApplication } from '@playwright/test';
import { execFile , spawn , type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import process from 'node:process';
