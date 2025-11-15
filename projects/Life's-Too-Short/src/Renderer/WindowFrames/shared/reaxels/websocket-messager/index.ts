const wss_port = await IpcRendererInvoke('get-wss-port:message').invoke();

const ws = new WebSocket( `ws://localhost:${wss_port}` );

const wsPromise = new Promise<WebSocket>( ( resolve , reject ) => {
	ws.onopen = () => {
		console.log( '已连接到服务器' );
		resolve( ws );
	};
	ws.onerror = ( err ) => {
		console.error( 'WebSocket 错误:' , err );
		reject( err );
	};
} );

const wsHandlers = new Map<string, ((data: any, code?: number) => void)[]>();

// 注册函数（接收）
export const wsOn = async<Type extends keyof WS.ServerSend>(
	msgType: Type,
	cb: (
		data: WS.ServerSend[Type]["data"],
		code: WS.ServerSend[Type]["code"]
	) => void
) => {
	await wsPromise;
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
export const wsSend = async<Type extends keyof WS.ClientSend>(
	type: Type,
	data: WS.ClientSend[Type]["data"],
	code: WS.ClientSend[Type]["code"]
) => {
	await wsPromise;
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


// 连接关闭
ws.onclose = () => {
	console.log( '连接已关闭' );
};


import { IpcRendererInvoke } from '#renderer/utils/useIPC';
import { type WS } from '#src/types/WS';
