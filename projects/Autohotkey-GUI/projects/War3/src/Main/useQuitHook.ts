export const useQuitHook = (win:BrowserWindow) => {
	
	win.on( 'close' , ( event ) => {
		
		const res = appQuitHook();
		if( res ) {
			//true代表用户从托盘图标退出应用
		} else {
			//false代表用户手动关闭窗口,但应用没有实际退出,而是最小化至托盘
			event.preventDefault();  // 阻止窗口关闭
			win.hide();  // 隐藏窗口
		}
		
	} );
}
import { appQuitHook } from './tray';
import type { BrowserWindow } from 'electron';
