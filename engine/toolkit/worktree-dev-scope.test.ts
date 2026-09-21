/**
 * worktree 开发端口起点：同一路径稳定，linked 与主 checkout 分槽，env 覆盖 CLI。
 * 契约：docs/architecture/worktree-dev-server.md
 */

const tmpRoot = fs.mkdtempSync( path.join( os.tmpdir() , 'worktree-dev-scope-' ) );

describe( 'worktree-dev-scope' , () => {
	after( () => {
		fs.rmSync( tmpRoot , {
			recursive : true ,
			force : true,
		} );
	} );

	it( '同一路径 hash 稳定' , () => {
		const a = 'Z:/electron-reaxes-react-worktrees/bugfix';
		const b = 'Z:\\electron-reaxes-react-worktrees\\bugfix';
		assert.equal( worktreePortOffset( a ) , worktreePortOffset( b ) );
		assert.equal( normalizeWorktreePath( a ) , normalizeWorktreePath( b ) );
	} );

	it( '不同路径通常落到不同 offset' , () => {
		assert.notEqual(
			worktreePortOffset( 'Z:/electron-reaxes-react-worktrees/index' ) ,
			worktreePortOffset( 'Z:/electron-reaxes-react-worktrees/bugfix' ),
		);
	} );

	it( '主 checkout（.git 目录）走 4444/9229/9222' , () => {
		const root = path.join( tmpRoot , 'primary' );
		fs.mkdirSync( path.join( root , '.git' ) , {
			recursive : true,
		} );
		const scope = resolveWorktreeDevScope( root );
		assert.equal( scope.isLinkedWorktree , false );
		assert.equal( scope.rendererPort , PRIMARY_RENDERER_PORT );
		assert.equal( scope.inspectPort , PRIMARY_INSPECT_PORT );
		assert.equal( scope.cdpPort , PRIMARY_CDP_PORT );
		const preferred = resolvePreferredRendererPort( {
			cliPort : 4444 ,
			repoRoot : root,
		} );
		assert.equal( preferred.source , 'cli' );
		assert.equal( preferred.preferredPort , 4444 );
	} );

	it( 'linked worktree 忽略 CLI 4444，改用 hash 块' , () => {
		const root = path.join( tmpRoot , 'linked' );
		fs.mkdirSync( root , {
			recursive : true,
		} );
		fs.writeFileSync( path.join( root , '.git' ) , 'gitdir: /tmp/fake.git\n' );
		const preferred = resolvePreferredRendererPort( {
			cliPort : 4444 ,
			repoRoot : root,
		} );
		assert.equal( preferred.source , 'worktree' );
		assert.equal( preferred.scope.isLinkedWorktree , true );
		assert.notEqual( preferred.preferredPort , 4444 );
		assert.ok( preferred.preferredPort >= 20000 );
		assert.ok( preferred.preferredPort < 25000 );
		assert.equal( preferred.scope.inspectPort , preferred.preferredPort + 1 );
		assert.equal( preferred.scope.cdpPort , preferred.preferredPort + 2 );
	} );

	it( 'DEV_SERVER_PORT 覆盖 worktree hash' , () => {
		const root = path.join( tmpRoot , 'env-override' );
		fs.mkdirSync( root , {
			recursive : true,
		} );
		fs.writeFileSync( path.join( root , '.git' ) , 'gitdir: /tmp/fake.git\n' );
		const preferred = resolvePreferredRendererPort( {
			cliPort : 4444 ,
			envPort : '5555' ,
			repoRoot : root,
		} );
		assert.equal( preferred.source , 'env' );
		assert.equal( preferred.preferredPort , 5555 );
	} );
} );

import {
	PRIMARY_CDP_PORT ,
	PRIMARY_INSPECT_PORT ,
	PRIMARY_RENDERER_PORT ,
	normalizeWorktreePath ,
	resolvePreferredRendererPort ,
	resolveWorktreeDevScope ,
	worktreePortOffset,
} from './worktree-dev-scope';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after , describe , it } from 'node:test';
