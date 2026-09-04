/**
 * Settings 两套 dirty：页脚 runtime vs 表内 AIs。
 * 契约见 docs/features/manage-ais-save-scopes.md。
 */

const runtime = ( extra : Record<string , unknown> = {} ) => {
	return {
		networks : {
			global_proxy : { proxy_mode : 'direct' } ,
			proxy_server_list : [] ,
			proxy_test_urls : { foreign : 'https://a.example' , domestic : 'https://b.example' } ,
		} ,
		system : { gpu_acceleration : true } ,
		startup : { aiPageLoadMode : 'last-used-ai' } ,
		appearance : { theme : 'system' , language : 'follow-system' , darkmode : false } ,
		AIs : [ { id : 'A' , label : 'A' } ] ,
		...extra ,
	};
};

describe( '页脚 dirty 不计 AIs / 测试 URL' , () => {
	it( '改 AIs 或 proxy_test_urls 指纹不变' , () => {
		const base = snapshotRuntimeSettingsForDirty( runtime() );
		const changedAIs = snapshotRuntimeSettingsForDirty( runtime( {
			AIs : [ { id : 'A' , label : 'renamed' } , { id : 'B' , label : 'B' } ] ,
		} ) );
		const changedTestUrl = snapshotRuntimeSettingsForDirty( runtime( {
			networks : {
				global_proxy : { proxy_mode : 'direct' } ,
				proxy_server_list : [] ,
				proxy_test_urls : { foreign : 'https://other.example' , domestic : 'https://b.example' } ,
			} ,
		} ) );
		assert.equal( JSON.stringify( base ) , JSON.stringify( changedAIs ) );
		assert.equal( JSON.stringify( base ) , JSON.stringify( changedTestUrl ) );
	} );

	it( '改主题会变' , () => {
		const base = snapshotRuntimeSettingsForDirty( runtime() );
		const dark = snapshotRuntimeSettingsForDirty( runtime( {
			appearance : { theme : 'dark' , language : 'follow-system' , darkmode : true } ,
		} ) );
		assert.notEqual( JSON.stringify( base ) , JSON.stringify( dark ) );
	} );

	it( '改 startup.aiPageLoadMode 会变' , () => {
		const base = snapshotRuntimeSettingsForDirty( runtime() );
		const firstAi = snapshotRuntimeSettingsForDirty( runtime( {
			startup : { aiPageLoadMode : 'first-ai' } ,
		} ) );
		assert.notEqual( JSON.stringify( base ) , JSON.stringify( firstAi ) );
	} );
} );

describe( '弹窗单条提交不洗净表草稿' , () => {
	it( '提交 A 的新名字后，B 的未保存 disable 仍 dirty' , () => {
		const live = [
			{ id : 'A' , label : 'A-new' , disabled : false } ,
			{ id : 'B' , label : 'B' , disabled : true } ,
		];
		const committedSnapshot = new Map( [
			[ 'A' , JSON.stringify( { id : 'A' , label : 'A-new' , disabled : false } ) ] ,
			[ 'B' , JSON.stringify( { id : 'B' , label : 'B' , disabled : false } ) ] ,
		] );
		const last = fingerprintCommittedAIsForDirty(
			live ,
			new Set( [ 'A' , 'B' ] ) ,
			committedSnapshot ,
		);
		const current = fingerprintAIsDirtyState( live , [] );
		assert.notEqual( current , last );
	} );

	it( '只提交这一条且其它行未改时表级不 dirty' , () => {
		const live = [
			{ id : 'A' , label : 'A-new' , disabled : false } ,
			{ id : 'B' , label : 'B' , disabled : false } ,
		];
		const committedSnapshot = new Map( [
			[ 'A' , JSON.stringify( { id : 'A' , label : 'A-new' , disabled : false } ) ] ,
			[ 'B' , JSON.stringify( { id : 'B' , label : 'B' , disabled : false } ) ] ,
		] );
		const last = fingerprintCommittedAIsForDirty(
			live ,
			new Set( [ 'A' , 'B' ] ) ,
			committedSnapshot ,
		);
		assert.equal( fingerprintAIsDirtyState( live , [] ) , last );
	} );

	it( '字段顺序不同仍视为未 dirty' , () => {
		const live = [
			{ disabled : false , label : 'A-new' , id : 'A' } ,
		];
		const committedSnapshot = new Map( [
			[ 'A' , JSON.stringify( { id : 'A' , label : 'A-new' , disabled : false } ) ] ,
		] );
		const last = fingerprintCommittedAIsForDirty(
			live ,
			new Set( [ 'A' ] ) ,
			committedSnapshot ,
		);
		assert.equal( fingerprintAIsDirtyState( live , [] ) , last );
	} );
} );

import {
	fingerprintAIsDirtyState ,
	fingerprintCommittedAIsForDirty ,
	snapshotRuntimeSettingsForDirty,
} from '#shared/utils/settings-dirty-scopes.utility';
import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
