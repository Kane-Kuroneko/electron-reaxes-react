/**
 * AI / 菜单快捷键必须是应用内。Ctrl+W 不得走 globalShortcut。
 * 契约见 docs/issues/shortcuts-must-be-in-app.md。
 */

const input = ( partial : {
	control?:boolean;
	meta?:boolean;
	alt?:boolean;
	shift?:boolean;
} ) => {
	return {
		control : false ,
		meta : false ,
		alt : false ,
		shift : false ,
		...partial,
	};
};

describe( 'resolveAISwitchShortcutAction' , () => {
	it( 'Ctrl+W / Cmd+W 关闭当前 AI' , () => {
		assert.equal( resolveAISwitchShortcutAction( input( { control : true } ) , 'w' , 'KeyW' ) , 'closeCurrent' );
		assert.equal( resolveAISwitchShortcutAction( input( { meta : true } ) , 'w' , 'KeyW' ) , 'closeCurrent' );
	} );

	it( 'Ctrl+[ / ] 切已打开页；Alt+[ / ] 切已启用页' , () => {
		assert.equal( resolveAISwitchShortcutAction( input( { control : true } ) , '[' , 'BracketLeft' ) , 'previousInstantiated' );
		assert.equal( resolveAISwitchShortcutAction( input( { control : true } ) , ']' , 'BracketRight' ) , 'nextInstantiated' );
		assert.equal( resolveAISwitchShortcutAction( input( { alt : true } ) , '[' , 'BracketLeft' ) , 'previousConfigured' );
		assert.equal( resolveAISwitchShortcutAction( input( { alt : true } ) , ']' , 'BracketRight' ) , 'nextConfigured' );
	} );

	it( 'Ctrl+Tab / Ctrl+Shift+Tab 切已打开页' , () => {
		assert.equal( resolveAISwitchShortcutAction( input( { control : true } ) , 'tab' , 'Tab' ) , 'nextInstantiatedTab' );
		assert.equal( resolveAISwitchShortcutAction( input( { control : true , shift : true } ) , 'tab' , 'Tab' ) , 'previousInstantiatedTab' );
	} );

	it( '无修饰的 W 不是关闭' , () => {
		assert.equal( resolveAISwitchShortcutAction( input( {} ) , 'w' , 'KeyW' ) , null );
	} );
} );

describe( '源码门闩：禁止 globalShortcut' , () => {
	const shortcutsDir = path.join( process.cwd() , 'projects/ChatAIO/src/Main/services/shortcuts' );
	const viewsSrc = fs.readFileSync(
		path.join( process.cwd() , 'projects/ChatAIO/src/Main/reaxels/Views/index.ts' ) ,
		'utf8',
	);
	const aiSwitchSrc = fs.readFileSync( path.join( shortcutsDir , 'ai-switch.ts' ) , 'utf8' );
	const windowKeyboardSrc = fs.readFileSync( path.join( shortcutsDir , 'window-keyboard.ts' ) , 'utf8' );

	it( '不得调用 globalShortcut.register / unregister' , () => {
		const usage = /globalShortcut\s*\.\s*(register|unregister|isRegistered|unregisterAll)/;
		assert.equal( usage.test( aiSwitchSrc ) , false );
		assert.equal( usage.test( windowKeyboardSrc ) , false );
		assert.equal( usage.test( viewsSrc ) , false );
		assert.equal( /registerAISwitchGlobalShortcuts/.test( viewsSrc ) , false );
		assert.equal( /unregisterAISwitchGlobalShortcuts/.test( viewsSrc ) , false );
	} );

	it( 'window-keyboard 必须把 AI 快捷键接进 before-input-event' , () => {
		assert.match( windowKeyboardSrc , /handleAISwitchShortcutInput/ );
		assert.match( windowKeyboardSrc , /before-input-event/ );
	} );
} );

import { resolveAISwitchShortcutAction } from '#main/services/shortcuts/ai-switch';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe , it } from 'node:test';
