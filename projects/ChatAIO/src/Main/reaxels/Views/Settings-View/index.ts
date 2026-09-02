const {absAppRunningPath} = reaxel_ElectronENV()
/**
 * Settings 中心 WCV。冷启动不立刻创建：等启动 AI 页 settle 后再 preload，
 * 未首展保持 attach + hidden（不要盖下可见）。用户先打开则走这条同步创建。
 * 设计：docs/features/settings-view-preload.md
 */
export const reaxel_SettingsView = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		settingsView : {
			view : checkAs<WebContentsView>(null),
			hasPresented : false,
		}
	} );
	
	function initSettingsView(){
		const {view} = store.settingsView;
		if( view && !isWebContentsViewDead( view ) ) {
			return view;
		}
		/* 须静态 import：Views 为 webpack async module，sync require 得到 Promise */
		mutate.settingsView( s => {
			s.view = initWebContentsView( {
				type : 'Settings-View' ,
				refreshBounds : ( settingsView ) => {
					if( Reaxel_View.store.settingsViewOpened ) {
						Reaxel_View().fitContentView( settingsView );
						return;
					}
					if( store.settingsView.hasPresented !== true ) {
						Reaxel_View().parkUnpresentedPreloadView( settingsView );
					}
				} ,
				webPreferences:{
					preload: path.join(absAppRunningPath, 'preload.js'),
				}
			} );
			s.hasPresented = false;
		} );
		const created = store.settingsView.view;
		if( created && Reaxel_View.store.settingsViewOpened !== true ) {
			Reaxel_View().parkUnpresentedPreloadView( created );
			/* load 完成时 Chromium 可能把新 WCV 置顶或抢走输入焦点；未打开则把当前 AI 抬回来。 */
			const keepCurrentAiOnTop = () => {
				if( Reaxel_View.store.settingsViewOpened ) {
					return;
				}
				if( isWebContentsViewDead( created ) ) {
					return;
				}
				Reaxel_View().parkUnpresentedPreloadView( created );
				Reaxel_View().presentActiveCenterView( 'recover' );
			};
			created.webContents.on( 'did-stop-loading' , keepCurrentAiOnTop );
			created.webContents.on( 'did-fail-load' , keepCurrentAiOnTop );
			/* loadFile 可能在绑监听前就结束；isLoading=false 也可能是尚未 start，recover 仍安全。 */
			if( created.webContents.isLoading() !== true ) {
				keepCurrentAiOnTop();
			}
		}
		return created;
	}
	
	const rtn = {
		initSettingsView,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );


import { WebContentsView } from "electron";
import { Reaxel_View } from '#main/reaxels/Views';
import { initWebContentsView } from "#main/reaxels/Views/utils/initWebContentsView";
import { isWebContentsViewDead } from '#main/services/web-contents-view-alive.utility';
import { reaxel_ElectronENV } from "#generics/reaxels/runtime-paths";
import * as path from 'node:path';
