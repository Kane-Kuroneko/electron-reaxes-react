const BUILD_STATE_VERSION = 1;
const BUILD_STATE_PLUGIN_NAME = 'BuildStateWebpackPlugin';

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

export const getBuildStatePath = (distPath:string) => {
	return path.join( path.resolve( distPath ) , '.webpack-build-state.json' );
};

export const resetBuildState = (statePath:string , reason = 'webpack') => {
	writeBuildState( statePath , {
		version : BUILD_STATE_VERSION ,
		reason ,
		pid : process.pid ,
		createdAt : new Date().toISOString() ,
		updatedAt : new Date().toISOString() ,
		targets : {},
	} );
};

export const createBuildStateWebpackPlugin = (options:BuildStateWebpackPluginOptions) => {
	const statePath = path.resolve( options.statePath );
	const target = options.target;
	const label = options.label ?? target;
	const artifacts = options.artifacts ?? [];
	const writeTarget = (patch:Partial<BuildStateTarget>) => {
		updateBuildStateTarget( statePath , target , {
			target ,
			label ,
			artifacts ,
			...patch,
		} );
	};
	return {
		apply(compiler:Compiler) {
			const pluginName = `${ BUILD_STATE_PLUGIN_NAME }:${ target }`;
			const markBuilding = () => {
				writeTarget( {
					status : 'building' ,
					startedAt : new Date().toISOString() ,
					endedAt : null ,
					hash : null ,
					errors : [],
				} );
			};
			compiler.hooks.compile.tap( pluginName , markBuilding );
			compiler.hooks.invalid.tap( pluginName , markBuilding );
			compiler.hooks.failed.tap( pluginName , error => {
				writeTarget( {
					status : 'error' ,
					endedAt : new Date().toISOString() ,
					hash : null ,
					errors : [ formatWebpackError( error ) ],
				} );
			} );
			compiler.hooks.done.tap( pluginName , stats => {
				const errors = getStatsErrors( stats );
				if( errors.length ) {
					writeTarget( {
						status : 'error' ,
						endedAt : new Date().toISOString() ,
						hash : stats.hash ?? null ,
						errors,
					} );
					return;
				}
				writeTarget( {
					status : 'success' ,
					endedAt : new Date().toISOString() ,
					hash : stats.hash ?? null ,
					errors : [],
				} );
			} );
		},
	};
};

export const updateBuildStateTarget = (statePath:string , target:string , patch:Partial<BuildStateTarget>) => {
	const previous = readBuildStateFile( statePath ) ?? createEmptyBuildState();
	const previousTarget = previous.targets[target];
	const nextTarget:BuildStateTarget = {
		target ,
		label : patch.label ?? previousTarget?.label ?? target ,
		status : patch.status ?? previousTarget?.status ?? 'building' ,
		artifacts : patch.artifacts ?? previousTarget?.artifacts ?? [] ,
		startedAt : patch.startedAt ?? previousTarget?.startedAt ?? null ,
		endedAt : patch.endedAt ?? previousTarget?.endedAt ?? null ,
		updatedAt : new Date().toISOString() ,
		hash : patch.hash ?? previousTarget?.hash ?? null ,
		errors : patch.errors ?? previousTarget?.errors ?? [] ,
		sequence : ( previousTarget?.sequence ?? 0 ) + 1,
	};
	writeBuildState( statePath , {
		...previous ,
		version : BUILD_STATE_VERSION ,
		pid : process.pid ,
		updatedAt : new Date().toISOString() ,
		targets : {
			...previous.targets ,
			[target] : nextTarget,
		},
	} );
};

export const assertFreshElectronStartupArtifacts = (options:FreshArtifactOptions) => {
	const defaultSourcePaths = resolveSourcePaths( options.sourcePaths ?? [] );
	const buildState = options.buildStatePath ? readBuildStateFileStrict( options.buildStatePath ) : null;
	const artifactStates = options.artifacts.map( artifact => {
		const sourcePaths = artifact.sourcePaths ? resolveSourcePaths( artifact.sourcePaths ) : defaultSourcePaths;
		const artifactPath = path.resolve( artifact.path );
		const newestSource = findNewestSource( sourcePaths );
		const artifactExists = fs.existsSync( artifactPath );
		const stale = artifactExists && newestSource ? fs.statSync( artifactPath ).mtimeMs < newestSource.mtimeMs : false;
		const buildStateTarget = artifact.buildStateTarget ? buildState?.targets?.[artifact.buildStateTarget] : null;
		const buildStateFailure = getBuildStateFailure( buildStateTarget );
		return {
			...artifact ,
			path : artifactPath ,
			newestSource ,
			missing : !artifactExists ,
			stale,
			buildStateTarget ,
			buildStateFailure,
		};
	} );
	const failedArtifacts = artifactStates.filter( artifact => artifact.missing || artifact.stale || artifact.buildStateFailure );

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
		if( artifact.buildStateFailure ) {
			lines.push( `  build state: ${ artifact.buildStateFailure }` );
			if( artifact.buildStateTarget?.errors?.length ) {
				lines.push( ...artifact.buildStateTarget.errors.slice( 0 , 5 ).map( error => `    - ${ error }` ) );
			}
		}
		lines.push( `  newest source: ${ artifact.newestSource ? `${ artifact.newestSource.path } (${ new Date( artifact.newestSource.mtimeMs ).toLocaleString() })` : 'not found' }` );
	}
	lines.push( 'Run yarn start:webpack ChatAIO first, or run yarn build:webpack for a production build.' );
	throw new Error( lines.join( '\n' ) );
};

const resolveSourcePaths = (sourcePaths:string[]) => {
	return sourcePaths.map( item => path.resolve( item ) );
};

const createEmptyBuildState = ():BuildState => {
	return {
		version : BUILD_STATE_VERSION ,
		reason : 'webpack' ,
		pid : process.pid ,
		createdAt : new Date().toISOString() ,
		updatedAt : new Date().toISOString() ,
		targets : {},
	};
};

const readBuildStateFile = (statePath:string):BuildState | null => {
	if( !fs.existsSync( statePath ) ) {
		return null;
	}
	try {
		return JSON.parse( fs.readFileSync( statePath , 'utf8' ) ) as BuildState;
	} catch( error ) {
		return null;
	}
};

const readBuildStateFileStrict = (statePath:string):BuildState | null => {
	if( !fs.existsSync( statePath ) ) {
		return null;
	}
	try {
		return JSON.parse( fs.readFileSync( statePath , 'utf8' ) ) as BuildState;
	} catch( error ) {
		throw new Error( `[BuildArtifacts] Failed to read build state: ${ statePath }\n${ formatWebpackError( error ) }` );
	}
};

const writeBuildState = (statePath:string , state:BuildState) => {
	const resolvedStatePath = path.resolve( statePath );
	fs.mkdirSync( path.dirname( resolvedStatePath ) , {
		recursive : true,
	} );
	const tempPath = `${ resolvedStatePath }.${ process.pid }.tmp`;
	fs.writeFileSync( tempPath , JSON.stringify( state , null , '\t' ) );
	fs.renameSync( tempPath , resolvedStatePath );
};

const getBuildStateFailure = (target:BuildStateTarget | null) => {
	if( !target ) {
		return '';
	}
	if( target.status === 'building' ) {
		return `${ target.label } is still building since ${ target.startedAt ?? target.updatedAt }`;
	}
	if( target.status === 'error' ) {
		return `${ target.label } failed at ${ target.endedAt ?? target.updatedAt }`;
	}
	return '';
};

const getStatsErrors = (stats:Stats) => {
	const errors = stats.toJson( {
		all : false ,
		errors : true ,
		errorDetails : true,
	} ).errors ?? [];
	return errors.
	map( formatWebpackError ).
	slice( 0 , 20 );
};

const formatWebpackError = (error:unknown) => {
	if( error instanceof Error ) {
		return trimBuildStateError( error.stack || error.message );
	}
	if( typeof error === 'string' ) {
		return trimBuildStateError( error );
	}
	if( error && typeof error === 'object' ) {
		const errorLike = error as {
			message?: string;
			details?: string;
		};
		return trimBuildStateError( errorLike.message || errorLike.details || JSON.stringify( error ) );
	}
	return trimBuildStateError( String( error ) );
};

const trimBuildStateError = (error:string) => {
	return error.length > 2000 ? `${ error.slice( 0 , 2000 ) }...` : error;
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
	buildStatePath?: string;
	artifacts: FreshArtifact[];
};

export type FreshArtifact = {
	label: string;
	path: string;
	sourcePaths?: string[];
	buildStateTarget?: string;
};

export type BuildStateWebpackPluginOptions = {
	statePath: string;
	target: string;
	label?: string;
	artifacts?: string[];
};

export type BuildState = {
	version: number;
	reason: string;
	pid: number;
	createdAt: string;
	updatedAt: string;
	targets: Record<string , BuildStateTarget>;
};

export type BuildStateTarget = {
	target: string;
	label: string;
	status: BuildStateStatus;
	artifacts: string[];
	startedAt: string | null;
	endedAt: string | null;
	updatedAt: string;
	hash: string | null;
	errors: string[];
	sequence: number;
};

export type BuildStateStatus = 'building' | 'success' | 'error';

type NewestSource = {
	path: string;
	mtimeMs: number;
} | null;

import fs from 'node:fs';
import path from 'node:path';
import type { Compiler , Stats } from 'webpack';
