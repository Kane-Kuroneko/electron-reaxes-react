/**
 * App 壳上的 Settings 切页埋点：layout / first-paint、isDirty 耗时、侧栏 select 开 trace。
 * 只观察，不改 `RootMenu.current` 和面板 keep-alive。
 * 见 docs/features/settings-menu-switch-perf.md
 */
export const useSettingsMenuPerf = ( current:string ) => {
	useLayoutEffect( () => {
		if( !hasActiveSettingsMenuTrace() ) {
			return;
		}
		noteSettingsMenu( SettingsMenuPerfPhase.AppLayout , { current } );
		requestAnimationFrame( () => {
			requestAnimationFrame( () => {
				noteSettingsMenu( SettingsMenuPerfPhase.FirstPaint , { current } );
				if( !settingsMenuTraceAwaitingPanel() ) {
					endSettingsMenuTrace( { source : 'app' } );
				}
			} );
		} );
	} , [ current ] );

	const markMenuSelect = ( input:{
		from: string;
		to: string;
		firstVisit: boolean;
		aiCount: number;
	} ) => {
		beginSettingsMenuTrace( input );
	};

	const measureDirty = ( compute:() => boolean ):boolean => {
		const dirtyStarted = hasActiveSettingsMenuTrace() ? performance.now() : 0;
		const dirty = compute();
		if( dirtyStarted ) {
			noteSettingsMenu( SettingsMenuPerfPhase.DirtyComputed , {
				ms : Math.round( ( performance.now() - dirtyStarted ) * 100 ) / 100 ,
				dirty ,
			} );
		}
		return dirty;
	};

	return {
		markMenuSelect ,
		measureDirty ,
	};
};

import {
	beginSettingsMenuTrace ,
	endSettingsMenuTrace ,
	hasActiveSettingsMenuTrace ,
	noteSettingsMenu ,
	settingsMenuTraceAwaitingPanel ,
	SettingsMenuPerfPhase ,
} from './settings-menu-perf.utility';
import { useLayoutEffect } from 'react';
