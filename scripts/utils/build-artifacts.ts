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
	const defaultSourcePaths = resolveSourcePaths( options.sourcePaths ?? [] );
	const artifactStates = options.artifacts.map( artifact => {
		const sourcePaths = artifact.sourcePaths ? resolveSourcePaths( artifact.sourcePaths ) : defaultSourcePaths;
		const artifactPath = path.resolve( artifact.path );
		const newestSource = findNewestSource( sourcePaths );
		const artifactExists = fs.existsSync( artifactPath );
		const stale = artifactExists && newestSource ? fs.statSync( artifactPath ).mtimeMs < newestSource.mtimeMs : false;
		return {
			...artifact ,
			path : artifactPath ,
			newestSource ,
			missing : !artifactExists ,
			stale,
		};
	} );
	const failedArtifacts = artifactStates.filter( artifact => artifact.missing || artifact.stale );

	if( failedArtifacts.length === 0 ) {
		return;
	}

	const lines = [
		'[BuildArtifacts] Electron startup artifacts are not fresh.',
	];
	for( const artifact of failedArtifacts ) {
		lines.push( `${ artifact.label }:` );
		if( artifact.missing ) {
			lines.push( `  missing artifact: ${ artifact.path }` );
		}
		if( artifact.stale ) {
			const stat = fs.statSync( artifact.path );
			lines.push( `  stale artifact: ${ artifact.path } (${ stat.mtime.toLocaleString() })` );
		}
		lines.push( `  newest source: ${ artifact.newestSource ? `${ artifact.newestSource.path } (${ new Date( artifact.newestSource.mtimeMs ).toLocaleString() })` : 'not found' }` );
	}
	lines.push( 'Run yarn start:webpack AI-WebApp first, or run yarn build:webpack for a production build.' );
	throw new Error( lines.join( '\n' ) );
};

const resolveSourcePaths = (sourcePaths:string[]) => {
	return sourcePaths.map( item => path.resolve( item ) );
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
	sourcePaths?: string[];
	artifacts: FreshArtifact[];
};

export type FreshArtifact = {
	label: string;
	path: string;
	sourcePaths?: string[];
};

type NewestSource = {
	path: string;
	mtimeMs: number;
} | null;

import fs from 'node:fs';
import path from 'node:path';
