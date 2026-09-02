export type ChatAioE2EPaths = {
	repoRoot : string;
	chatAioRoot : string;
	distDir : string;
	electronExecutable : string;
};

export const resolveChatAioE2EPaths = ():ChatAioE2EPaths => {
	const e2eDir = path.dirname( fileURLToPath( import.meta.url ) );
	const chatAioRoot = path.resolve( e2eDir , '../..' );
	const repoRoot = path.resolve( chatAioRoot , '../..' );
	const distDir = path.join( chatAioRoot , 'dist' );
	return {
		repoRoot ,
		chatAioRoot ,
		distDir ,
		electronExecutable : resolveElectronExecutable(),
	};
};

const resolveElectronExecutable = () => {
	const electronPackageDir = path.dirname(
		createRequire( import.meta.url ).resolve( 'electron/package.json' ),
	);
	const distDir = path.join( electronPackageDir , 'dist' );
	if( process.platform === 'win32' ) {
		return path.join( distDir , 'electron.exe' );
	}
	if( process.platform === 'darwin' ) {
		return path.join( distDir , 'Electron.app' , 'Contents' , 'MacOS' , 'Electron' );
	}
	return path.join( distDir , 'electron' );
};

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
