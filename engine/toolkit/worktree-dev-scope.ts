/**
 * 按 git worktree 路径派生开发端口「起点」。
 * linked worktree 用路径 hash 得到稳定的 renderer / inspect / CDP 首选口；
 * 主 checkout 沿用 4444 / 9229 / 9222。首选口被占则 portfinder 顺延，不报错。
 * Electron 不得用这里的首选口去连 WDS，必须以 dist/.webpack-build-state.json 的
 * `devServer`（listen 成功后的真实口）为准。
 * 设计：projects/ChatAIO/docs/architecture/worktree-dev-server.md
 */

export const PRIMARY_RENDERER_PORT = 4444;
export const PRIMARY_INSPECT_PORT = 9229;
export const PRIMARY_CDP_PORT = 9222;

const WORKTREE_BLOCK_BASE = 20000;
const WORKTREE_BLOCK_COUNT = 500;
const WORKTREE_BLOCK_SIZE = 10;

export type WorktreeDevScope = {
	isLinkedWorktree : boolean;
	repoRoot : string;
	rendererPort : number;
	inspectPort : number;
	cdpPort : number;
};

export const normalizeWorktreePath = (root:string) => {
	const resolved = path.resolve( root ).replace( /\\/g , '/' );
	return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

export const isLinkedWorktree = (root:string) => {
	const gitPath = path.join( root , '.git' );
	if( !fs.existsSync( gitPath ) ) {
		return false;
	}
	return fs.statSync( gitPath ).isFile();
};

export const worktreePortOffset = (root:string) => {
	const digest = crypto.createHash( 'sha256' ).update( normalizeWorktreePath( root ) ).digest();
	return digest.readUInt32BE( 0 ) % WORKTREE_BLOCK_COUNT;
};

export const resolveWorktreeDevScope = (
	repoRoot:string = absolutelyPath_RepositoryRoot,
):WorktreeDevScope => {
	if( isLinkedWorktree( repoRoot ) === false ) {
		return {
			isLinkedWorktree : false ,
			repoRoot ,
			rendererPort : PRIMARY_RENDERER_PORT ,
			inspectPort : PRIMARY_INSPECT_PORT ,
			cdpPort : PRIMARY_CDP_PORT,
		};
	}
	const block = WORKTREE_BLOCK_BASE + worktreePortOffset( repoRoot ) * WORKTREE_BLOCK_SIZE;
	return {
		isLinkedWorktree : true ,
		repoRoot ,
		rendererPort : block ,
		inspectPort : block + 1 ,
		cdpPort : block + 2,
	};
};

/**
 * 解析 WDS 首选口：DEV_SERVER_PORT env 最高；linked worktree 忽略 package.json 里写死的 4444，
 * 改用 hash 起点；主 checkout 用 CLI / 默认 4444。
 */
export const resolvePreferredRendererPort = (options:{
	cliPort?: number | string | null;
	envPort?: string | null;
	repoRoot?: string;
} = {}) => {
	const scope = resolveWorktreeDevScope( options.repoRoot );
	const envPort = parsePortNumber( options.envPort ?? process.env.DEV_SERVER_PORT );
	if( envPort ) {
		return {
			preferredPort : envPort ,
			scope ,
			source : 'env' as const,
		};
	}
	if( scope.isLinkedWorktree ) {
		return {
			preferredPort : scope.rendererPort ,
			scope ,
			source : 'worktree' as const,
		};
	}
	const cliPort = parsePortNumber( options.cliPort );
	return {
		preferredPort : cliPort ?? PRIMARY_RENDERER_PORT ,
		scope ,
		source : 'cli' as const,
	};
};

export const createDevRendererOrigin = (port:number) => {
	return `https://localhost:${ port }`;
};

export const parsePortNumber = (value:unknown):number | null => {
	if( value === null || typeof value === 'undefined' || value === '' ) {
		return null;
	}
	const num = typeof value === 'number' ? value : parseInt( String( value ) , 10 );
	if( Number.isSafeInteger( num ) && num >= 1 && num <= 65535 ) {
		return num;
	}
	return null;
};

import { absolutelyPath_RepositoryRoot } from './repo-paths';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
