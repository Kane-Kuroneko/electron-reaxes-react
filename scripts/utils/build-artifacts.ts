export const resetBuildDist = (distPath:string , reason = 'webpack') => {
	const resolvedDistPath = path.resolve( distPath );
	if( !resolvedDistPath.endsWith( `${ path.sep }dist` ) ) {
		throw new Error( `[BuildArtifacts] Refuse to remove non-dist path: ${ resolvedDistPath }` );
	}
	fs.rmSync( resolvedDistPath , {
		recursive : true ,
		force : true,
	} );
	fs.mkdirSync( resolvedDistPath , {
		recursive : true,
	} );
	console.log( `[BuildArtifacts] reset dist for ${ reason }: ${ resolvedDistPath }` );
};

export const assertFreshElectronStartupArtifacts = (options:FreshArtifactOptions) => {
	const sourcePaths = options.sourcePaths.map( item => path.resolve( item ) );
	const artifacts = options.artifacts.map( item => ( {
		...item ,
		path : path.resolve( item.path ),
	} ) );
	const newestSource = findNewestSource( sourcePaths );
	const missing = artifacts.filter( artifact => !fs.existsSync( artifact.path ) );
	const stale = artifacts.filter( artifact => {
		if( !fs.existsSync( artifact.path ) || !newestSource ) return false;
		return fs.statSync( artifact.path ).mtimeMs < newestSource.mtimeMs;
	} );

	if( missing.length === 0 && stale.length === 0 ) {
		return;
	}

	const lines = [
		'[BuildArtifacts] Electron startup artifacts are not fresh.',
		`newest source: ${ newestSource ? `${ newestSource.path } (${ new Date( newestSource.mtimeMs ).toLocaleString() })` : 'not found' }`,
	];
	if( missing.length ) {
		lines.push( 'missing artifacts:' );
		lines.push( ...missing.map( artifact => `  - ${ artifact.label }: ${ artifact.path }` ) );
	}
	if( stale.length ) {
		lines.push( 'stale artifacts:' );
		lines.push( ...stale.map( artifact => {
			const stat = fs.statSync( artifact.path );
			return `  - ${ artifact.label }: ${ artifact.path } (${ stat.mtime.toLocaleString() })`;
		} ) );
	}
	lines.push( 'Run yarn start:webpack AI-WebApp first, or run yarn build:webpack for a production build.' );
	throw new Error( lines.join( '\n' ) );
};

const findNewestSource = (sourcePaths:string[]) => {
	let newest:NewestSource = null;
	for( const sourcePath of sourcePaths ) {
		visitSourcePath( sourcePath , candidate => {
			if( !newest || candidate.mtimeMs > newest.mtimeMs ) {
				newest = candidate;
			}
		} );
	}
	return newest;
};

const visitSourcePath = (sourcePath:string , onFile:(source:NonNullable<NewestSource>) => void) => {
	if( !fs.existsSync( sourcePath ) ) {
		return;
	}
	const stat = fs.statSync( sourcePath );
	if( stat.isFile() ) {
		if( shouldUseSourceFile( sourcePath ) ) {
			onFile( {
				path : sourcePath ,
				mtimeMs : stat.mtimeMs,
			} );
		}
		return;
	}
	if( !stat.isDirectory() || shouldSkipDirectory( sourcePath ) ) {
		return;
	}
	for( const entry of fs.readdirSync( sourcePath ) ) {
		visitSourcePath( path.join( sourcePath , entry ) , onFile );
	}
};

const shouldSkipDirectory = (sourcePath:string) => {
	const name = path.basename( sourcePath );
	return [
		'.git' ,
		'.idea' ,
		'.qoder' ,
		'.codex' ,
		'.cursor' ,
		'node_modules' ,
		'dist' ,
		'__Bin' ,
		'logs',
	].includes( name );
};

const shouldUseSourceFile = (sourcePath:string) => {
	return /\.(c|m)?(t|j)sx?$|\.json$|\.html$|\.less$|\.css$/i.test( sourcePath );
};

export type FreshArtifactOptions = {
	sourcePaths: string[];
	artifacts: Array<{
		label: string;
		path: string;
	}>;
};

type NewestSource = {
	path: string;
	mtimeMs: number;
} | null;

import fs from 'node:fs';
import path from 'node:path';
