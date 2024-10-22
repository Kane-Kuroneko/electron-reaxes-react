const root = createRoot( document.getElementById( "react-app-root" ) );

// const ipcRenderer = _Danger_Native_IpcRenderer_;

// console.log(_Danger_Native_IpcRenderer_);

// console.log(ipcAPI.ipcRenderer());

@reaxper
class App extends Reaxlass {
	render() {
		return <div className = "war3-ahk-reaxes">
			<I18NDropdown></I18NDropdown>
			<AltInventory></AltInventory>
			<Divider />
			<ForbidMouseWheels />
			<Divider />
			<ReplaceF6 />
			<Divider />
			<RbuttonDragging></RbuttonDragging>
			<Divider />
			<MainSwitch/>
		</div>;
	}
}

root.render( <App /> );


// 在渲染进程的JavaScript代码中
window.addEventListener('keydown', (event) => {
	// 这里你可以添加你的逻辑，例如触发某个功能
	if (event.key === 'F12') {
		IPC.send( 'json' , {
			type : 'shortcut' ,
			data : {
				key : event.key ,
				type : "keydown" ,
			} ,
		} );
	}
});


import { ForbidMouseWheels } from './Forbid-MouseWheels';
import { ReplaceF6 } from './Replace-F6';
import { RbuttonDragging } from './Rbutton-Dragging';
import { MainSwitch } from './Main-Switch';
import { AltInventory , HotKey , FunctionSwitcher , I18NDropdown , IconPopoverDesc } from '../pure-components';
import { Divider } from 'antd';
import './styles/global.module.less';
import { createRoot } from "react-dom/client";
import { Reaxlass , reaxper } from 'reaxes-react';
import { reaxel , Reaxes , orzMobx  } from 'reaxes';
