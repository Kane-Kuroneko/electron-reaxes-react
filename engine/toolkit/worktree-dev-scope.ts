/**
 * 开发端口起点：所有 worktree（含主 checkout）都从 CLI / 默认 4444、inspect 9229、CDP 9222 起；
 * 被占则 portfinder +1。不要按路径 hash 跳到两万档。
 * Electron 不得用这里的首选口去连 WDS，必须以 dist/.webpack-build-state.json 的
 * `devServer`（listen 成功后的真实口）为准。
 * 设计：projects/ChatAIO/docs/architecture/worktree-dev-server.md
 */

export const PRIMARY_RENDERER_PORT = 4444;
export const PRIMARY_INSPECT_PORT = 9229;
export const PRIMARY_CDP_PORT = 9222;

export type WorktreeDevScope = {
	isLinkedWorktree : boolean;
	repoRoot : string;
	rendererPort : number;
	inspectPort : number;
	cdpPort : number;
};

export const isLinkedWorktree = (root:string) => {
	const gitPath = path.join( root , '.git' );
	if( !fs.existsSync( gitPath ) ) {
		return false;
	}
	return fs.statSync( gitPath ).isFile();
};

export const resolveWorktreeDevScope = (
	repoRoot:string = absolutelyPath_RepositoryRoot,
):WorktreeDevScope => {
	return {
		isLinkedWorktree : isLinkedWorktree( repoRoot ) ,
		repoRoot ,
		rendererPort : PRIMARY_RENDERER_PORT ,
		inspectPort : PRIMARY_INSPECT_PORT ,
		cdpPort : PRIMARY_CDP_PORT,
	};
};

/**
 * 解析 WDS 首选口：DEV_SERVER_PORT env 最高，否则 CLI / 默认 4444。
 * linked worktree 与主 checkout 同一套起点，隔离靠各树自己的 dist JSON。
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
import fs from 'node:fs';
import path from 'node:path';
