export type IPCChannels = {
	json : {
		//魔兽游戏进程是否存在的轮询结果
		'war3-process-existence' : boolean,
		//由view向ahk单向发送指令
		'ahk' : {
			key : string;
			value : boolean|number
		}[],
		//
		'monitor-war3exe-process' : 'start' | 'stop',
		'spawn' : 'war3-ahk',
		'exit-ahk' : null,
		'shortcut' : {
			key : string;
			type : "keydown",
		}
		
		
		//ahk进程状态
		'ahk-cp-status' : boolean,
		
	},
	
	console : any,
	
}

type IPC_Main_To_Webview = {
	
}

type IPC_Webview_To_Main = {
	
}
