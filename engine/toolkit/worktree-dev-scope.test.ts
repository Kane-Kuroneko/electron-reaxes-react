/**
 * 开发端口起点：主树 / linked worktree 都从 4444 起，env 可覆盖。
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

	it( 'linked worktree 也从 CLI 4444 起，不跳两万档' , () => {
		const root = path.join( tmpRoot , 'linked' );
		fs.mkdirSync( root , {
			recursive : true,
		} );
		fs.writeFileSync( path.join( root , '.git' ) , 'gitdir: /tmp/fake.git\n' );
		const preferred = resolvePreferredRendererPort( {
			cliPort : 4444 ,
			repoRoot : root,
		} );
		assert.equal( preferred.source , 'cli' );
		assert.equal( preferred.scope.isLinkedWorktree , true );
		assert.equal( preferred.preferredPort , 4444 );
		assert.equal( preferred.scope.inspectPort , PRIMARY_INSPECT_PORT );
		assert.equal( preferred.scope.cdpPort , PRIMARY_CDP_PORT );
	} );

	it( 'DEV_SERVER_PORT 覆盖 CLI' , () => {
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
	resolvePreferredRendererPort ,
	resolveWorktreeDevScope,
} from './worktree-dev-scope';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after , describe , it } from 'node:test';
