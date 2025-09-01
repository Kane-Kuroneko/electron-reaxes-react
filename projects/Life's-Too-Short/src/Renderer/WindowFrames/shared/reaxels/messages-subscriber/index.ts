const wss_port = await IpcRendererInvoke('get-wss-port:message').invoke();

const ws = new WebSocket( `ws://localhost:${wss_port}` );

const wsHandlers = new Map<string, ((data: any, code?: number) => void)[]>();

// 注册函数（接收）
export const wsOn = <Type extends keyof WS.ServerSend>(
	msgType: Type,
	cb: (
		data: WS.ServerSend[Type]["data"],
		code: WS.ServerSend[Type]["code"]
	) => void
) => {
	if (!wsHandlers.has(msgType as string)) {
		wsHandlers.set(msgType as string, []);
	}
	const handlers = wsHandlers.get(msgType as string)!;
	handlers.push(cb);
	
	// disposer
	return function dispose(){
		const idx = handlers.indexOf(cb);
		if (idx !== -1) {
			handlers.splice(idx, 1);
		}
	};
};

ws.addEventListener("message", (evt) => {
	let parsed;
	try {
		parsed = JSON.parse(evt.data);
	} catch {
		return;
	}
	const { type, data, code } = parsed;
	const handlers = wsHandlers.get(type);
	if (handlers) {
		for (const cb of handlers) {
			cb(data, code);
		}
	}
});

// 发送函数
export const wsSend = <Type extends keyof WS.ClientSend>(
	type: Type,
	data: WS.ClientSend[Type]["data"],
	code: WS.ClientSend[Type]["code"]
) => {
	ws.send(JSON.stringify({ type, data, code }));
};

// 单入口 message 监听器
ws.addEventListener("message", (evt) => {
	try {
		var parsed = JSON.parse(evt.data);
	} catch {
		return; // 非 JSON 消息直接忽略
	}
	
	const { type, data, code } = parsed;
	const handlers = wsHandlers.get(type);
	if (handlers) {
		for (const cb of handlers) {
			cb(data, code);
		}
	}
});

// 连接成功
ws.onopen = () => {
	console.log( '已连接到服务器' );
	ws.send( '你好，服务器' );
};

// 接收消息
ws.onmessage = ( event ) => {
	console.log( '收到服务器消息:' , event.data );
};

// 连接关闭
ws.onclose = () => {
	console.log( '连接已关闭' );
};

// 发生错误
ws.onerror = ( err ) => {
	console.error( 'WebSocket 错误:' , err );
};

import { IpcRendererInvoke } from '#renderer/utils/useIPC';
import { type WS } from '#src/types/WS';
