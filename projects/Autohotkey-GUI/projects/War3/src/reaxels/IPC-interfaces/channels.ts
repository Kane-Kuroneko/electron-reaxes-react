type JsonTypes =
// 魔兽游戏进程是否存在的轮询结果，暂时用不到
	| { type: 'war3-process-existence', data: boolean }
	
	// 由 view 向 ahk 单向发送指令，data 是一个包含多个对象的数组，每个对象有 key 和 value
	| { type: 'ahk', data: { key: string; value: boolean | number }[] }
	
	// GUI 指令给主进程：开启或停止 war3 进程监控，data 的值是 'start' 或 'stop'
	| { type: 'monitor-war3exe-process', data: 'start' | 'stop' }
	
	// 指令给主进程：启动一个新的 war3-ahk 进程，data 的值为 'war3-ahk'
	| { type: 'spawn', data: 'war3-ahk' }
	
	// 指令给主进程：退出 ahk 进程，data 的值为 null
	| { type: 'exit-ahk', data: null }
	
	// 指令给主进程：按键事件，data 包含一个键和类型，类型为 'keydown'
	| { type: 'shortcut', data: { key: string; type: 'keydown' } }
	
	// 指令给渲染进程：系统信息，data 包含系统语言
	| { type: 'system-info', data: { systemLanguage: Languages } }
	
	// ahk 进程的状态，data 是一个 boolean 值
	| { type: 'ahk-cp-status', data: boolean };


export type IPCChannels = {
	json: JsonTypes,
	
	console: any,
	
}

import type { Languages } from '#generic/reaxels/Factories/i18n';
