/**
 * BuildArtifacts — 构建产物生命周期管理
 *
 * 架构职责分层：
 *   - BuildStateWebpackPlugin   : webpack watch 运行时写入编译状态（诊断用，非 gating）
 *   - assertFreshElectronStartupArtifacts : Electron 启动前的产物完整性校验（dev 模式仅校验存在性）
 *
 * Dev 模式设计决策：
 *   产物缺失 → 致命错误（未跑过 webpack:start）
 *   产物过期 → 警告但不阻止（用户自行判断是否需要重编译）
 *   BuildState status → 仅用于诊断消息，不作为启动 gating 条件
 *
 * 动机：BuildState 由 webpack watch 进程写入，若 watch 进程死亡，
 *   status 会永久残留 'building'/'error' → 若作为 gating 条件，
 *   将导致 Electron 永远无法启动，必须重新 webpack:start 来 resetBuildState。
 */
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

/**
 * Electron 启动前的产物完整性校验（dev 模式专用）
 *
 * Dev 模式 gating 策略：
 *   - 产物缺失 → throw Error（未跑过 webpack:start，必须阻塞）
 *   - 产物过期（源码 mtime > 产物 mtime）→ console.warn 诊断信息，不阻塞启动
 *   - BuildState status → 仅附加到诊断消息中，不作为 gating 条件
 *
 * 不再依赖 BuildState 做启动 gating 的原因：
 *   BuildState 由 webpack watch 进程写入，若 watch 进程死亡或文件损坏，
 *   status 永久残留 'building'/'error' 将导致 Electron 永远无法启动。
 *   Dev 模式下用户主动执行 start:electron，理应自行判断产物是否足够新鲜。
 */
export const assertFreshElectronStartupArtifacts = (options:FreshArtifactOptions) => {
	const defaultSourcePaths = resolveSourcePaths( options.sourcePaths ?? [] );
	const buildState = options.buildStatePath ? readBuildStateFile( options.buildStatePath ) : null;

	const artifactStates = options.artifacts.map( artifact => {
		const sourcePaths = artifact.sourcePaths ? resolveSourcePaths( artifact.sourcePaths ) : defaultSourcePaths;
		const artifactPath = path.resolve( artifact.path );
		const newestSource = findNewestSource( sourcePaths );
		const artifactExists = fs.existsSync( artifactPath );
		const artifactMtime = artifactExists ? fs.statSync( artifactPath ).mtimeMs : null;
		const buildStateTarget = artifact.buildStateTarget ? buildState?.targets?.[artifact.buildStateTarget] : null;

		/*仅基于文件 mtime 判断过期，不受 BuildState status 影响*/
		const stale = artifactExists && newestSource && artifactMtime < newestSource.mtimeMs;

		/*提取 BuildState 诊断信息（仅用于日志，不参与 gating）*/
		const buildStateDiagnostic = getBuildStateDiagnostic( buildStateTarget );

		return {
			...artifact ,
			path : artifactPath ,
			newestSource ,
			missing : !artifactExists ,
			stale ,
			artifactMtime ,
			buildStateTarget ,
			buildStateDiagnostic ,
		};
	} );

	const missingArtifacts = artifactStates.filter( a => a.missing );

	/*致命：产物缺失，必须阻塞启动*/
	if( missingArtifacts.length > 0 ) {
		const lines = [ '[BuildArtifacts] Electron 启动产物缺失，请先运行 webpack:start。' ];
		for( const a of missingArtifacts ) {
			lines.push( `  ${ a.label }: ${ a.path } 未找到` );
		}
		lines.push( '请执行 yarn start:webpack <project> 完成首次构建。' );
		throw new Error( lines.join( '\n' ) );
	}

	/*非致命：产物可能过期，仅输出诊断警告，不阻塞启动*/
	const staleArtifacts = artifactStates.filter( a => a.stale );
	if( staleArtifacts.length > 0 ) {
		const lines = [ '[BuildArtifacts] ⚠ 部分产物可能不是最新版本（源码已被修改）：' ];
		for( const a of staleArtifacts ) {
			const artifactTime = new Date( a.artifactMtime ).toLocaleString();
			const sourceTime = a.newestSource ? new Date( a.newestSource.mtimeMs ).toLocaleString() : '未知';
			lines.push( `  ${ a.label }: 产物构建于 ${ artifactTime }，源码修改于 ${ sourceTime }` );

			if( a.buildStateDiagnostic ) {
				lines.push( `    → ${ a.buildStateDiagnostic }` );
			}
		}
		lines.push( '  若 webpack watch 未运行，请执行 yarn start:webpack <project>。' );
		console.warn( lines.join( '\n' ) );
	}
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

const writeBuildState = (statePath:string , state:BuildState) => {
	const resolvedStatePath = path.resolve( statePath );
	fs.mkdirSync( path.dirname( resolvedStatePath ) , {
		recursive : true,
	} );
	const tempPath = `${ resolvedStatePath }.${ process.pid }.tmp`;
	fs.writeFileSync( tempPath , JSON.stringify( state , null , '\t' ) );
	fs.renameSync( tempPath , resolvedStatePath );
};

/**
 * 将 BuildState target 状态翻译为用户可读的诊断消息
 * 仅用于 dev 模式下的提示信息，不参与 gating 决策
 */
const getBuildStateDiagnostic = (target:BuildStateTarget | null) => {
	if( !target ) {
		return '';
	}
	if( target.status === 'building' ) {
		return `webpack 正在重新编译中（自 ${ target.startedAt ?? target.updatedAt }），请稍等片刻后重试 Electron`;
	}
	if( target.status === 'error' ) {
		let msg = `上次编译失败（${ target.endedAt ?? target.updatedAt }），产物可能不完整`;
		if( target.errors?.length ) {
			msg += `，错误: ${ target.errors[0] }`;
		}
		return msg;
	}
	/* status === 'success' — webpack 进程可能已停止但 BuildState 仍为 success */
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
