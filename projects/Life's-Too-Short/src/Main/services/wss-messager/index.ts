const ori_port = 6789;

portfinder.basePort = ori_port;
const port = await portfinder.getPortPromise();
console.log( `wss port:${ port }` );

IpcMainHandle( 'get-wss-port:message' ).handle( async( e ) => {
	
	return port;
} );

const wss = new WebSocketServer({ port: port });

const wssHandlers = new Map<string, ((ws: WebSocket, data: any, code?: number) => void)[]>();

// 服务端注册监听器
export const wssOn = <Type extends keyof WS.ClientSend>(
	msgType: Type,
	cb: (
		ws: WebSocket,
		data: WS.ClientSend[Type]['data'],
		code: WS.ClientSend[Type]['code']
	) => void
) => {
	if (!wssHandlers.has(msgType as string)) {
		wssHandlers.set(msgType as string, []);
	}
	wssHandlers.get(msgType as string)!.push(cb);
};

// 服务端发送消息（支持单播和广播）
export const wssSend = <Type extends keyof WS.ServerSend>(
	type: Type,
	data: WS.ServerSend[Type]['data'],
	code: WS.ServerSend[Type]['code'],
	target?: WebSocket // 不传则广播
) => {
	const msg = JSON.stringify({ type, data, code });
	if (target) {
		if (target.readyState === WebSocket.OPEN) {
			target.send(msg);
		}
	} else {
		for (const client of wss.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(msg);
			}
		}
	}
};


wss.on('connection', (ws, req) => {
	console.log('客户端已连接:', req.socket.remoteAddress);
	
	// 接收客户端消息
	ws.on('message', (raw) => {
		let parsed;
		try {
			parsed = JSON.parse(raw.toString());
		} catch {
			return;
		}
		const { type, data, code } = parsed;
		const handlers = wssHandlers.get(type);
		if (handlers) {
			for (const cb of handlers) {
				cb(ws, data, code);
			}
		}
	});
	
	// 连接关闭
	ws.on('close', () => {
		console.log('客户端断开连接');
	});
	
	// 发送初始化数据
	ws.send('欢迎连接 WebSocket 服务');
});

import {
	IpcMainOn ,
	useIpcSend ,
	IpcMainHandle,
} from '#main/utils/useIPC';
import { WS } from '#src/types/WS';
import WebSocket, { Server as WebSocketServer } from 'ws';
import portfinder from 'portfinder';
