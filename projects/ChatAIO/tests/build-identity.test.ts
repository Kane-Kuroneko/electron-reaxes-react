/**
 * 两层版本身份：发行 SemVer 与 git build 身份。
 * 契约：docs/architecture/app-version-identity.md
 */

describe( 'formatChatAioVersionLabel' , () => {
	it( '无身份时只出营销号' , () => {
		assert.equal( formatChatAioVersionLabel( '1.0.5' , null ) , 'v1.0.5' );
	} );

	it( '带 count + 9 位 hash' , () => {
		assert.equal(
			formatChatAioVersionLabel( '1.0.5' , {
				commit : 'ddebc2c82' ,
				count : 1234 ,
				dirty : false ,
			} ) ,
			'v1.0.5 (build 1234 · ddebc2c82)' ,
		);
	} );

	it( 'dirty 标在末尾' , () => {
		assert.equal(
			formatChatAioBuildSubtitle( {
				commit : 'ddebc2c82' ,
				count : 1234 ,
				dirty : true ,
			} ) ,
			'build 1234 · ddebc2c82 · dirty' ,
		);
	} );
} );

describe( 'coerceChatAioBuildIdentity' , () => {
	it( '接受 extraMetadata 里的字符串 count / dirty' , () => {
		assert.deepEqual(
			coerceChatAioBuildIdentity( {
				commit : 'ddebc2c82' ,
				count : '42' ,
				dirty : 'true' ,
			} ) ,
			{
				commit : 'ddebc2c82' ,
				count : 42 ,
				dirty : true ,
			} ,
		);
	} );

	it( '拒绝非法 hash' , () => {
		assert.equal(
			coerceChatAioBuildIdentity( {
				commit : 'not-a-hash' ,
				count : 1 ,
				dirty : false ,
			} ) ,
			null ,
		);
	} );
} );

describe( 'toElectronBuilderBuildNumber' , () => {
	it( '超过 Windows FileVersion 上限则钳到 65535' , () => {
		assert.equal( toElectronBuilderBuildNumber( 70000 ) , '65535' );
		assert.equal( toElectronBuilderBuildNumber( 1234 ) , '1234' );
	} );
} );

describe( 'decorateElectronBuilderForChatAioIdentity' , () => {
	const identity = {
		commit : 'ddebc2c82' ,
		count : 1234 ,
		dirty : false ,
	};

	it( '本地包改 artifactName 并写 BUILD_NUMBER / extraMetadata' , () => {
		const stamped = decorateElectronBuilderForChatAioIdentity( {
			args : [ 'build' , '-w' ] ,
			env : {} ,
			identity ,
			isRelease : false ,
		} );
		assert.equal( stamped.env.BUILD_NUMBER , '1234' );
		assert.equal( stamped.env.CHATAIO_GIT_COMMIT , 'ddebc2c82' );
		assert.ok( stamped.args.includes( '-c.extraMetadata.chataioBuild.commit=ddebc2c82' ) );
		assert.ok( stamped.args.includes( '-c.extraMetadata.chataioBuild.count=1234' ) );
		assert.ok(
			stamped.args.some( ( arg ) => arg.startsWith( '-c.artifactName=' ) && arg.includes( 'b${buildNumber}.ddebc2c82' ) ) ,
		);
	} );

	it( 'CHATAIO_RELEASE 不改发行文件名，仍注入身份' , () => {
		const stamped = decorateElectronBuilderForChatAioIdentity( {
			args : [ 'build' , '-w' ] ,
			env : {
				CHATAIO_RELEASE : '1' ,
			} ,
			identity : {
				...identity ,
				dirty : true ,
			} ,
			isRelease : true ,
		} );
		assert.equal( stamped.env.BUILD_NUMBER , '1234' );
		assert.ok( stamped.args.includes( '-c.extraMetadata.chataioBuild.dirty=true' ) );
		assert.equal(
			stamped.args.some( ( arg ) => arg.startsWith( '-c.artifactName=' ) ) ,
			false ,
		);
	} );

	it( 'dirty 本地包文件名带 .dirty' , () => {
		assert.equal( gitCommitArtifactToken( {
			commit : 'ddebc2c82' ,
			count : 1 ,
			dirty : true ,
		} ) , 'ddebc2c82.dirty' );
	} );
} );

describe( 'isChatAioReleaseBuild' , () => {
	it( '仅 1 / true 视为正式发版' , () => {
		assert.equal( isChatAioReleaseBuild( { CHATAIO_RELEASE : '1' } ) , true );
		assert.equal( isChatAioReleaseBuild( { CHATAIO_RELEASE : 'true' } ) , true );
		assert.equal( isChatAioReleaseBuild( { CHATAIO_RELEASE : 'yes' } ) , false );
		assert.equal( isChatAioReleaseBuild( {} ) , false );
	} );
} );

describe( 'collectGitBuildIdentity' , () => {
	it( '解析 count / short hash / porcelain dirty' , () => {
		const identity = collectGitBuildIdentity( '/repo' , ( args ) => {
			if( args[ 0 ] === 'rev-list' ) return ' 88 \n';
			if( args[ 0 ] === 'rev-parse' ) return 'ddebc2c82\n';
			if( args[ 0 ] === 'status' ) return ' M foo.ts\n';
			throw new Error( args.join( ' ' ) );
		} );
		assert.deepEqual( identity , {
			commit : 'ddebc2c82' ,
			count : 88 ,
			dirty : true ,
		} );
	} );

	it( '干净工作树 dirty=false' , () => {
		const identity = collectGitBuildIdentity( '/repo' , ( args ) => {
			if( args[ 0 ] === 'rev-list' ) return '3';
			if( args[ 0 ] === 'rev-parse' ) return 'abc1234de';
			if( args[ 0 ] === 'status' ) return '';
			throw new Error( args.join( ' ' ) );
		} );
		assert.equal( identity.dirty , false );
	} );
} );

import {
	coerceChatAioBuildIdentity ,
	formatChatAioBuildSubtitle ,
	formatChatAioVersionLabel ,
} from '#shared/build-identity.utility';
import {
	collectGitBuildIdentity ,
	decorateElectronBuilderForChatAioIdentity ,
	gitCommitArtifactToken ,
	isChatAioReleaseBuild ,
	toElectronBuilderBuildNumber ,
} from '#root/scripts/utils/git-build-identity';
import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
