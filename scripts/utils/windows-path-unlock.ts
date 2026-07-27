/**
 * Windows path unlock for build cleanup via LockHunter CLI.
 *
 * LockHunter `/unlock` closes remote file handles / unloads DLLs without
 * killing the locking process (same as its Explorer shell "Unlock" action).
 * Official CLI: LockHunter.exe [/unlock] [/silent] [/exit] <path>
 * @see https://lockhunter.com/manual.htm
 *
 * Resolution order for LockHunter.exe:
 *   1. LOCKHUNTER_PATH / LOCKHUNTER_EXE env
 *   2. Directory of registered LHShellExt (Explorer shell extension)
 *   3. Common install / portable locations
 */

export type UnlockPathResult = {
	ok: boolean;
	method: 'lockhunter' | 'none';
	exe: string | null;
	exitCode: number | null;
	detail: string;
	killedFromTree: Array<{ pid: number; name: string }>;
};

export async function unlockPathForBuild( targetPath:string ):Promise<UnlockPathResult> {
	if( process.platform !== 'win32' ) {
		return {
			ok : true ,
			method : 'none' ,
			exe : null ,
			exitCode : null ,
			detail : 'non-windows' ,
			killedFromTree : [],
		};
	}

	const target = path.resolve( targetPath );
	const killedFromTree = killProcessesRunningFrom( target );

	const exe = resolveLockHunterExe();
	if( !exe ) {
		return {
			ok : false ,
			method : 'none' ,
			exe : null ,
			exitCode : null ,
			detail : 'LockHunter.exe not found. Install LockHunter or set LOCKHUNTER_PATH.' ,
			killedFromTree,
		};
	}

	const unlock = runLockHunterUnlock( exe , target );
	return {
		ok : unlock.exitCode === 0 ,
		method : 'lockhunter' ,
		exe ,
		exitCode : unlock.exitCode ,
		detail : unlock.detail ,
		killedFromTree,
	};
}

export function resolveLockHunterExe():string | null {
	const fromEnv = [
		process.env.LOCKHUNTER_PATH ,
		process.env.LOCKHUNTER_EXE,
	].filter( ( v ):v is string => !!v && v.trim().length > 0 );

	for( const candidate of fromEnv ) {
		const resolved = normalizeExeCandidate( candidate.trim() );
		if( resolved ) {
			return resolved;
		}
	}

	for( const candidate of listLockHunterCandidatesFromShellExt() ) {
		const resolved = normalizeExeCandidate( candidate );
		if( resolved ) {
			return resolved;
		}
	}

	for( const candidate of listCommonLockHunterPaths() ) {
		const resolved = normalizeExeCandidate( candidate );
		if( resolved ) {
			return resolved;
		}
	}

	return null;
}

function runLockHunterUnlock( exe:string , target:string ):{ exitCode:number | null; detail:string } {
	// /unlock closes handles; /silent no GUI; /exit auto-quit.
	// Do NOT pass /kill — that terminates locking processes (e.g. Cursor).
	const result = spawnSync( exe , [ '/unlock' , '/silent' , '/exit' , target ] , {
		windowsHide : true ,
		encoding : 'utf8' ,
		timeout : 60_000,
	} );

	if( result.error ) {
		return {
			exitCode : null ,
			detail : result.error.message,
		};
	}

	const exitCode = result.status;
	const stderr = ( result.stderr || '' ).trim();
	const stdout = ( result.stdout || '' ).trim();
	const detail = exitCode === 0
		? 'ok'
		: ( stderr || stdout || `LockHunter exit ${ exitCode }` );

	return { exitCode , detail };
}

/**
 * Processes launched from the target tree (e.g. ChatAIO.exe) block folder
 * delete even after handle unlock. Terminate those only — never IDEs.
 */
function killProcessesRunningFrom( target:string ):Array<{ pid:number; name:string }> {
	if( !fs.existsSync( target ) ) {
		return [];
	}

	const prefix = ( path.resolve( target ) + path.sep ).toLowerCase();
	const ps = findPowerShell();
	const script = `
$ErrorActionPreference = 'SilentlyContinue'
$needle = ${ JSON.stringify( prefix ) }
Get-CimInstance Win32_Process | ForEach-Object {
  $exe = $_.ExecutablePath
  if (-not $exe) { return }
  if (-not $exe.ToLowerInvariant().StartsWith($needle)) { return }
  [PSCustomObject]@{ pid = [int]$_.ProcessId; name = $_.Name } | ConvertTo-Json -Compress
}
`.trim();

	const result = spawnSync( ps , [
		'-NoProfile' ,
		'-NonInteractive' ,
		'-ExecutionPolicy' , 'Bypass' ,
		'-Command' , script,
	] , {
		encoding : 'utf8' ,
		windowsHide : true ,
		maxBuffer : 4 * 1024 * 1024,
	} );

	const killed:Array<{ pid:number; name:string }> = [];
	for( const line of ( result.stdout || '' ).split( /\r?\n/ ) ) {
		const trimmed = line.trim();
		if( !trimmed ) {
			continue;
		}
		try {
			const row = JSON.parse( trimmed ) as { pid?: number; name?: string };
			if( typeof row.pid !== 'number' || row.pid === process.pid ) {
				continue;
			}
			try {
				process.kill( row.pid , 'SIGKILL' );
				killed.push( { pid : row.pid , name : row.name || '?' } );
			} catch {
				// already gone / access denied
			}
		} catch {
			// ignore non-json
		}
	}
	return killed;
}

function listLockHunterCandidatesFromShellExt():string[] {
	const out:string[] = [];
	const key = 'HKLM\\SOFTWARE\\Classes\\CLSID\\{0BB27CDA-7029-4C0E-9C56-D922B229F0EB}\\InprocServer32';
	const result = spawnSync( 'reg' , [ 'query' , key , '/ve' ] , {
		encoding : 'utf8' ,
		windowsHide : true,
	} );
	const text = `${ result.stdout || '' }\n${ result.stderr || '' }`;
	const match = text.match( /REG_SZ\s+(.+\.dll)/i );
	if( !match?.[1] ) {
		return out;
	}
	const dll = match[1].trim().replace( /^"|"$/g , '' );
	const dir = path.dirname( dll );
	out.push(
		path.join( dir , 'LockHunter.exe' ) ,
		path.join( dir , 'LockHunter64.exe' ) ,
		path.join( dir , 'LockHunter32.exe' ) ,
	);
	return out;
}

function listCommonLockHunterPaths():string[] {
	const roots = [
		process.env['ProgramFiles'] ,
		process.env['ProgramFiles(x86)'] ,
		process.env.LOCALAPPDATA ,
		process.env.USERPROFILE ? path.join( process.env.USERPROFILE , 'Downloads' ) : null,
	].filter( ( v ):v is string => !!v );

	const names = [
		'LockHunter\\LockHunter.exe' ,
		'LockHunter64\\LockHunter.exe' ,
		'LockHunter32\\LockHunter.exe' ,
		'LockHunter\\LockHunter64.exe' ,
		'LockHunter Portable\\LockHunter64.exe' ,
		'LockHunter Portable\\LockHunter.exe',
	];

	const out:string[] = [];
	for( const root of roots ) {
		for( const name of names ) {
			out.push( path.join( root , name ) );
		}
	}

	// Portable Chinese pack layout used on this machine / common downloads
	if( process.env.USERPROFILE ) {
		const downloads = path.join( process.env.USERPROFILE , 'Downloads' );
		try {
			for( const entry of fs.readdirSync( downloads ) ) {
				if( !/lockhunter/i.test( entry ) ) {
					continue;
				}
				const base = path.join( downloads , entry );
				out.push(
					path.join( base , 'LockHunter64' , 'LockHunter.exe' ) ,
					path.join( base , 'LockHunter32' , 'LockHunter.exe' ) ,
					path.join( base , 'LockHunter.exe' ) ,
				);
			}
		} catch {
			// ignore
		}
	}

	return out;
}

function normalizeExeCandidate( candidate:string ):string | null {
	const resolved = path.resolve( candidate );
	if( fs.existsSync( resolved ) && fs.statSync( resolved ).isFile() ) {
		return resolved;
	}
	if( fs.existsSync( resolved ) && fs.statSync( resolved ).isDirectory() ) {
		for( const name of [ 'LockHunter.exe' , 'LockHunter64.exe' , 'LockHunter32.exe' ] ) {
			const nested = path.join( resolved , name );
			if( fs.existsSync( nested ) ) {
				return nested;
			}
		}
	}
	return null;
}

function findPowerShell() {
	const root = process.env.SystemRoot || process.env.windir;
	if( root ) {
		const candidate = path.join( root , 'System32' , 'WindowsPowerShell' , 'v1.0' , 'powershell.exe' );
		if( fs.existsSync( candidate ) ) {
			return candidate;
		}
	}
	return 'powershell.exe';
}

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
