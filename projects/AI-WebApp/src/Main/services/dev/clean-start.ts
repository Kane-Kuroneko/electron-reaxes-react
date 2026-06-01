export type DevCleanStartResult = {
	success: boolean;
	userDataPath: string;
	error?: string;
};

export const requestDevCleanStart = ():DevCleanStartResult => {
	const userDataPath = app.getPath( 'userData' );
	if( !dev() ) {
		return {
			success : false ,
			userDataPath ,
			error : 'Clean start is only available in development mode.',
		};
	}
	try {
		spawnCleanupHelper( userDataPath );
		( app as any ).__aiWebAppQuitting = true;
		setTimeout( () => {
			app.exit( 0 );
		} , 180 );
		return {
			success : true ,
			userDataPath,
		};
	} catch ( error ) {
		return {
			success : false ,
			userDataPath ,
			error : error?.message || String( error ),
		};
	}
};

const spawnCleanupHelper = (userDataPath:string) => {
	if( process.platform === 'win32' ) {
		const scriptPath = path.join( app.getPath( 'temp' ) , `ai-webapp-clean-start-${ Date.now() }.ps1` );
		const logPath = scriptPath.replace( /\.ps1$/ , '.log' );
		fs.writeFileSync( scriptPath , createWindowsCleanupScript( userDataPath , logPath ) , 'utf-8' );
		const escapedScriptPath = escapePowerShellSingleQuote( scriptPath );
		const command = `Start-Process -WindowStyle Hidden -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File','${ escapedScriptPath }')`;
		const child = spawn( 'powershell.exe' , [
			'-NoProfile' ,
			'-ExecutionPolicy' ,
			'Bypass' ,
			'-Command' ,
			command,
		] , {
			detached : true ,
			stdio : 'ignore' ,
			windowsHide : true,
		} );
		child.unref();
		return;
	}
	const command = [
		`while kill -0 ${ process.pid } 2>/dev/null; do sleep 0.25; done`,
		`sleep 0.25`,
		`rm -rf -- "${ userDataPath.replaceAll( '"' , '\\"' ) }"`,
	].join( '; ' );
	const child = spawn( 'sh' , [ '-c' , command ] , {
		detached : true ,
		stdio : 'ignore',
	} );
	child.unref();
};

const createWindowsCleanupScript = (userDataPath:string , logPath:string) => {
	const target = escapePowerShellSingleQuote( userDataPath );
	const log = escapePowerShellSingleQuote( logPath );
	return [
		'$ErrorActionPreference = "Continue"',
		`$target = '${ target }'`,
		`$log = '${ log }'`,
		`$mainPid = ${ process.pid }`,
		'function Write-CleanLog($message) { Add-Content -LiteralPath $log -Value ("[{0}] {1}" -f (Get-Date).ToString("o"), $message) }',
		'Write-CleanLog ("clean-start target=" + $target)',
		'for($wait = 0; $wait -lt 120; $wait++) {',
		'	if(-not (Get-Process -Id $mainPid -ErrorAction SilentlyContinue)) { break }',
		'	Start-Sleep -Milliseconds 250',
		'}',
		'for($i = 0; $i -lt 100; $i++) {',
		'	Start-Sleep -Milliseconds 300',
		'	try {',
		'		if(Test-Path -LiteralPath $target) {',
		'			Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop',
		'			Write-CleanLog "removed target"',
		'		} else {',
		'			Write-CleanLog "target already missing"',
		'		}',
		'		break',
		'	} catch {',
		'		Write-CleanLog ("retry " + $i + ": " + $_.Exception.Message)',
		'	}',
		'}',
		'if(Test-Path -LiteralPath $target) { Write-CleanLog "failed: target still exists" }',
		'Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue',
	].join( '\r\n' );
};

const escapePowerShellSingleQuote = (text:string) => {
	return text.replaceAll( "'" , "''" );
};

import { app } from 'electron';
import { dev } from 'electron-is';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
