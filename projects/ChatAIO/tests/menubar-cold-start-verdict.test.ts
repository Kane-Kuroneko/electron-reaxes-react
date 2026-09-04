/**
 * 冷启动 menubar 白屏检测器：裁决纯函数回归。
 * 契约见 docs/features/menubar-cold-start-monitor.md
 *
 * 运行：yarn test（见 scripts.md）
 */

const ev = (
	ts : number ,
	name : string ,
	type : MenubarBootLogEvent['type'] = 'milestone' ,
	extra : Partial<MenubarBootLogEvent> = {},
) : MenubarBootLogEvent => {
	return {
		ts ,
		type ,
		name ,
		...extra ,
	};
};

describe( 'computeMenubarColdStartVerdict' , () => {
	it( 'Phase5 / 当前 WCV 早于 visual-ready 时判 conflict' , () => {
		const verdict = computeMenubarColdStartVerdict( [
			ev( 0 , 'boot-start' ) ,
			ev( 10 , 'window-show' ) ,
			ev( 50 , 'menu-view-ready' ) ,
			ev( 60 , 'phase-5-wait-resolved' , 'milestone' , { detail : { ready : true } } ) ,
			ev( 70 , 'phase-5-content-views-start' ) ,
			ev( 80 , 'wcv-load-attempt' ) ,
			ev( 4000 , 'renderer-visual-ready' ) ,
			{
				ts : 100 ,
				type : 'snapshot' ,
				snapshot : {
					windowVisible : true ,
					windowBg : '#ffffff' ,
					menubarLoading : true ,
					menubarUrl : 'https://localhost:4444/MainView/' ,
					menubarOsPid : 1 ,
					shellBounds : { x : 0 , y : 0 , width : 1280 , height : 36 } ,
					shellHeightIsMenuBar : true ,
					visibleWcvId : 'chatgpt' ,
					visibleWcvLoading : true ,
					visibleWcvUrl : 'https://chatgpt.com' ,
					visibleWcvBounds : { x : 0 , y : 36 , width : 1280 , height : 700 } ,
					visibleWcvCoversMenubar : false ,
					loadingWcvCount : 1 ,
					contentChildCount : 1 ,
					overlapLoading : true ,
					layers : [] ,
				} ,
			} ,
			{
				ts : 200 ,
				type : 'snapshot' ,
				snapshot : {
					windowVisible : true ,
					windowBg : '#ffffff' ,
					menubarLoading : true ,
					menubarUrl : 'https://localhost:4444/MainView/' ,
					menubarOsPid : 1 ,
					shellBounds : { x : 0 , y : 0 , width : 1280 , height : 36 } ,
					shellHeightIsMenuBar : true ,
					visibleWcvId : 'chatgpt' ,
					visibleWcvLoading : true ,
					visibleWcvUrl : 'https://chatgpt.com' ,
					visibleWcvBounds : { x : 0 , y : 36 , width : 1280 , height : 700 } ,
					visibleWcvCoversMenubar : false ,
					loadingWcvCount : 1 ,
					contentChildCount : 1 ,
					overlapLoading : true ,
					layers : [] ,
				} ,
			} ,
			{
				ts : 300 ,
				type : 'snapshot' ,
				snapshot : {
					windowVisible : true ,
					windowBg : '#ffffff' ,
					menubarLoading : false ,
					menubarUrl : 'https://localhost:4444/MainView/' ,
					menubarOsPid : 1 ,
					shellBounds : { x : 0 , y : 0 , width : 1280 , height : 36 } ,
					shellHeightIsMenuBar : true ,
					visibleWcvId : 'chatgpt' ,
					visibleWcvLoading : true ,
					visibleWcvUrl : 'https://chatgpt.com' ,
					visibleWcvBounds : { x : 0 , y : 36 , width : 1280 , height : 700 } ,
					visibleWcvCoversMenubar : false ,
					loadingWcvCount : 1 ,
					contentChildCount : 1 ,
					overlapLoading : false ,
					layers : [] ,
				} ,
			} ,
		] );

		assert.equal( verdict.severity , 'conflict' );
		assert.equal( verdict.suspects.includes( 'ready-before-visual' ) , true );
		assert.equal( verdict.suspects.includes( 'phase5-before-visual' ) , true );
		assert.equal( verdict.suspects.includes( 'wcv-load-before-visual' ) , true );
		assert.equal( verdict.suspects.includes( 'wcv-loading-overlaps-menubar-paint' ) , true );
		assert.equal( verdict.suspects.includes( 'slow-menubar-visual' ) , true );
		assert.equal( verdict.deltas.showToVisualMs , 3990 );
		assert.equal( verdict.deltas.overlapLoadingMs , 200 );
	} );

	it( 'visual-ready 之后才加载 WCV 且首绘快则 ok' , () => {
		const verdict = computeMenubarColdStartVerdict( [
			ev( 0 , 'boot-start' ) ,
			ev( 10 , 'window-show' ) ,
			ev( 40 , 'dom-ready' , 'wc-event' , { target : 'menubar' , name : 'dom-ready' } ) ,
			ev( 80 , 'renderer-visual-ready' ) ,
			ev( 90 , 'menu-view-ready' ) ,
			ev( 100 , 'phase-5-wait-resolved' , 'milestone' , { detail : { ready : true } } ) ,
			ev( 110 , 'phase-5-content-views-start' ) ,
			ev( 120 , 'wcv-load-attempt' ) ,
		] );

		assert.equal( verdict.severity , 'ok' );
		assert.equal( verdict.suspects.includes( 'wcv-load-before-visual' ) , false );
		assert.equal( verdict.deltas.showToVisualMs , 70 );
	} );

	it( '修后：ready 仍早于 visual，但 Phase5 等到 visual 之后则不 conflict' , () => {
		const verdict = computeMenubarColdStartVerdict( [
			ev( 0 , 'boot-start' ) ,
			ev( 10 , 'window-show' ) ,
			ev( 50 , 'menu-view-ready' ) ,
			ev( 200 , 'renderer-visual-ready' ) ,
			ev( 210 , 'phase-5-wait-resolved' , 'milestone' , {
				detail : { ready : true , gate : 'visual-ready' } ,
			} ) ,
			ev( 220 , 'phase-5-content-views-start' ) ,
			ev( 230 , 'wcv-load-attempt' ) ,
			ev( 240 , 'phase-3-overlay-warm' ) ,
		] );

		assert.equal( verdict.severity , 'ok' );
		assert.equal( verdict.suspects.includes( 'ready-before-visual' ) , true );
		assert.equal( verdict.suspects.includes( 'phase5-before-visual' ) , false );
		assert.equal( verdict.suspects.includes( 'wcv-load-before-visual' ) , false );
		assert.equal( verdict.suspects.includes( 'overlay-before-visual' ) , false );
	} );

	it( 'FloatingView 早于 visual-ready 时记 overlay-before-visual' , () => {
		const verdict = computeMenubarColdStartVerdict( [
			ev( 0 , 'boot-start' ) ,
			ev( 10 , 'window-show' ) ,
			ev( 20 , 'phase-3-overlay-warm' ) ,
			ev( 2000 , 'renderer-visual-ready' ) ,
			ev( 2010 , 'phase-5-content-views-start' ) ,
		] );

		assert.equal( verdict.suspects.includes( 'overlay-before-visual' ) , true );
		assert.equal( verdict.severity , 'conflict' );
	} );

	it( 'WCV 盖住 menubar 条带时记 wcv-covers-menubar' , () => {
		const verdict = computeMenubarColdStartVerdict( [
			ev( 0 , 'boot-start' ) ,
			ev( 10 , 'window-show' ) ,
			ev( 80 , 'renderer-visual-ready' ) ,
			{
				ts : 50 ,
				type : 'snapshot' ,
				snapshot : {
					windowVisible : true ,
					windowBg : '#ffffff' ,
					menubarLoading : false ,
					menubarUrl : '' ,
					menubarOsPid : 1 ,
					shellBounds : { x : 0 , y : 0 , width : 1280 , height : 36 } ,
					shellHeightIsMenuBar : true ,
					visibleWcvId : 'chatgpt' ,
					visibleWcvLoading : true ,
					visibleWcvUrl : 'https://chatgpt.com' ,
					visibleWcvBounds : { x : 0 , y : 0 , width : 1280 , height : 736 } ,
					visibleWcvCoversMenubar : true ,
					loadingWcvCount : 1 ,
					contentChildCount : 1 ,
					overlapLoading : false ,
					layers : [] ,
				} ,
			} ,
		] );

		assert.equal( verdict.suspects.includes( 'wcv-covers-menubar' ) , true );
		assert.equal( verdict.severity , 'conflict' );
	} );

	it( 'waitUntilRendererReady 超时记 wait-timeout' , () => {
		const verdict = computeMenubarColdStartVerdict( [
			ev( 0 , 'boot-start' ) ,
			ev( 10 , 'window-show' ) ,
			ev( 15000 , 'phase-5-wait-resolved' , 'milestone' , {
				detail : { ready : false , timedOut : true } ,
			} ) ,
			ev( 15100 , 'phase-5-content-views-start' ) ,
			ev( 16000 , 'renderer-visual-ready' ) ,
		] );

		assert.equal( verdict.suspects.includes( 'wait-timeout' ) , true );
		assert.equal( verdict.marks.waitTimedOut , true );
	} );
} );

describe( '冷启动调用序（源码门闩）' , () => {
	const runtimeSrc = fs.readFileSync(
		path.join( process.cwd() , 'projects/ChatAIO/src/Main/runtime.ts' ) ,
		'utf8',
	);
	const viewsSrc = fs.readFileSync(
		path.join( process.cwd() , 'projects/ChatAIO/src/Main/reaxels/Views/index.ts' ) ,
		'utf8',
	);
	const phase2At = runtimeSrc.indexOf( 'Phase 2 — MainWindow' );
	const phase5At = runtimeSrc.indexOf( 'Phase 5 — 等菜单项 layout' );

	it( '首次 startMainRuntime：waitUntilRendererReady 早于 initRuntimeViews，且不提前 initFloatingView' , () => {
		assert.ok( phase2At >= 0 && phase5At >= 0 , 'runtime 必须保留 Phase 2 / Phase 5 注释锚点' );
		const betweenPhase2And5 = runtimeSrc.slice( phase2At , phase5At );
		assert.equal( /initFloatingView\s*\(/.test( betweenPhase2And5 ) , false );
		const waitAt = runtimeSrc.indexOf( 'waitUntilRendererReady' , phase5At );
		const viewsAt = runtimeSrc.indexOf( 'initRuntimeViews' , phase5At );
		assert.ok( waitAt >= 0 , 'Phase5 必须等 visual-ready' );
		assert.ok( viewsAt >= 0 , 'Phase5 必须 initRuntimeViews' );
		assert.ok( waitAt < viewsAt , 'Phase5 必须先等 menubar 再创建内容 WCV' );
	} );

	it( 'initRuntimeViews：当前 AI 先于 FloatingView' , () => {
		const loadAt = viewsSrc.indexOf( 'onReadyLoadAIView()' );
		const fvAt = viewsSrc.indexOf( 'initFloatingView()' );
		assert.ok( loadAt >= 0 && fvAt >= 0 );
		assert.ok( loadAt < fvAt );
	} );

	it( 'syncAIViewsWithConfig 在 runtime views 未初始化时必须直接 return' , () => {
		const aiSrc = fs.readFileSync(
			path.join( process.cwd() , 'projects/ChatAIO/src/Main/reaxels/Views/AI-Views/index.ts' ) ,
			'utf8',
		);
		assert.match( aiSrc , /areRuntimeViewsInitialized\(\) === false/ );
	} );

	it( 'Phase 5 门闩走 menu-view:visual-ready，不挂在 boot-probe 上' , () => {
		const mainViewSrc = fs.readFileSync(
			path.join( process.cwd() , 'projects/ChatAIO/src/Main/reaxels/Views/Main-View/index.ts' ) ,
			'utf8',
		);
		const visualIpcAt = mainViewSrc.indexOf( "useIpcRendererToMain( 'menu-view:visual-ready' )" );
		const bootProbeAt = mainViewSrc.indexOf( "useIpcRendererToMain( 'menubar:boot-probe' )" );
		assert.ok( visualIpcAt >= 0 , '必须有 menu-view:visual-ready 门闩' );
		assert.ok( bootProbeAt >= 0 , '观测通道仍可存在' );
		const visualBlock = mainViewSrc.slice( visualIpcAt , visualIpcAt + 500 );
		const bootBlock = mainViewSrc.slice( bootProbeAt , bootProbeAt + 400 );
		assert.match( visualBlock , /markVisualReady/ );
		assert.equal( /markVisualReady|mainViewVisualReady/.test( bootBlock ) , false );
	} );
} );


import { computeMenubarColdStartVerdict } from '#shared/menubar-cold-start-monitor';
import type { MenubarBootLogEvent } from '#shared/menubar-cold-start-monitor';
import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
