if(isElectron){
	var { IPC } = await import('../ENV/electron')
}
const root = createRoot( document.getElementById( "react-app-root" ) );

// const ipcRenderer = _Danger_Native_IpcRenderer_;

// console.log(_Danger_Native_IpcRenderer_);

// console.log(ipcAPI.ipcRenderer());

@reaxper
class App extends Reaxlass {
	render() {
		
		return <div className = "war3-ahk-reaxes">
			<I18NDropdown/>
			<AltInventory/>
			<Divider style = { { borderColor : '#dcdcdc' } } />
			<ForbidMouseWheels />
			<Divider style = { { borderColor : '#dcdcdc' } } />
			<ReplaceF6 />
			<Divider />
			<RbuttonDragging/>
			<Divider style = { { borderColor : '#dcdcdc' } } />
			<MButtonToAtttack/>
			<Divider style = { { borderColor : '#dcdcdc' } } />
			<MainSwitch />
			
			<RightBottomFloatButtons/>
		</div>;
	}
}

root.render( <App /> );


// 在渲染进程的JavaScript代码中
window.addEventListener( 'keydown' , ( event ) => {
	// 这里你可以添加你的逻辑，例如触发某个功能
	if( event.key === 'F12' ) {
		IPC?.send( 'json' , {
			type : 'shortcut' ,
			data : {
				key : event.key ,
				type : "keydown" ,
			} ,
		} );
	}
} );

IPC?.on( 'console' , ( e , data ) => {
	console.log( data );
} );


import { RightBottomFloatButtons } from './RightBottom-FloatButtons';
import { isElectron } from '../ENV';
import { MButtonToAtttack } from './MButton-to-Atttack';
import { I18NDropdown } from './I18N-Dropdown';
import { ForbidMouseWheels } from './Forbid-MouseWheels';
import { ReplaceF6 } from './Replace-F6';
import { RbuttonDragging } from './Rbutton-Dragging';
import { MainSwitch } from './Main-Switch';
import { AltInventory , HotKey , FunctionSwitcher , IconPopoverDesc } from '../pure-components';
import { Divider } from 'antd';
import './styles/global.module.less';
import './styles/index.less';
import { createRoot } from "react-dom/client";
import { Reaxlass , reaxper } from 'reaxes-react';
import { reaxel , Reaxes , orzMobx } from 'reaxes';
