/**
 * build-state.devServer 会合：写入后 electron.start 能读到真实口；pid 死后断言失败。
 * 契约：projects/ChatAIO/docs/architecture/worktree-dev-server.md
 */

const tmpRoot = fs.mkdtempSync( path.join( os.tmpdir() , 'build-state-dev-server-' ) );

describe( 'build-state devServer rendezvous' , () => {
	after( () => {
		fs.rmSync( tmpRoot , {
			recursive : true ,
			force : true,
		} );
	} );

	it( '写入后再读出实际口与 origin' , () => {
		const statePath = path.join( tmpRoot , '.webpack-build-state.json' );
		resetBuildState( statePath , 'test' );
		writeBuildStateDevServer( statePath , {
			port : 4445 ,
			origin : 'https://localhost:4445' ,
			host : 'localhost' ,
			protocol : 'https' ,
			pid : process.pid ,
			boundAt : '2026-09-21T00:00:00.000Z' ,
			inspectPort : 9229 ,
			cdpPort : 9222 ,
			worktree : true,
		} );
		const state = readBuildState( statePath );
		assert.equal( state?.devServer?.port , 4445 );
		assert.equal( state?.devServer?.origin , 'https://localhost:4445' );
		assert.equal( state?.devServer?.worktree , true );
		const rendezvous = assertDevServerRendezvous( statePath );
		assert.equal( rendezvous.port , 4445 );
	} );

	it( '缺少 devServer 时 electron 启动应失败' , () => {
		const statePath = path.join( tmpRoot , 'missing-dev-server.json' );
		resetBuildState( statePath , 'test' );
		assert.throws(
			() => assertDevServerRendezvous( statePath ) ,
			/没有 devServer/,
		);
	} );
} );

import {
	assertDevServerRendezvous ,
	readBuildState ,
	resetBuildState ,
	writeBuildStateDevServer,
} from './build-artifacts';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after , describe , it } from 'node:test';
