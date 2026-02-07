/**
 * 在main thread中创建ipc
 * @example
 * const useIpcRpc = createIpc<IpcRpc>('rpc');
 * const {disposer} = useIpcRpc('get-settings').handle(({event},...args) => {
 *    return {}
 * });
 * const useRtmEvent = createIpc<RendererToMainEvent>('rtmEvent');
 * const {disposer} = useRtmEvent('get-settings').on(({event,reply},...args) => {
 *    reply('settings-changed').send(...settings);
 * });
 *
 * const useMtrEvent = createIpc<MainToRendererEvent>('mtrEvent');
 * const {disposer} = useMtrEvent('settings-changed').targets([mainWebContentsView]).send({...settings});
 */
export function createIpc<IpcRpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>>>( type: 'rpc' ):
	<Channel extends keyof IpcRpc>( channel: Channel ) => {
		handle(handler:( meta: { event: IpcMainInvokeEvent } , ...payloads: IpcRpc[Channel]["payloads"] )=> IpcRpc[Channel]["response"]|Promise<IpcRpc[Channel]["response"]> ):Handler
	}
export function createIpc<
	RendererToMainEvents extends Record<string , IpcStructure.RendererToMainEvent<unknown[] , {channel:unknown,args:unknown[]}>>, //reply功能依赖RendererToMainEvent[reply],可以在业务类型中映射到MainToRendererEvent[args]
>( type: 'rtmEvent' ):
	<Channel extends string&keyof RendererToMainEvents>( channel: Channel ) => {
		on(handler:(
			meta: {
				event: IpcMainEvent,
				reply<Reply extends RendererToMainEvents[Channel]["reply"]>( channel: Reply['channel'] ): {send( ...args: Reply['args'] ): void;}
			} ,
			...args: RendererToMainEvents[Channel]["args"]
		) => void): {disposer(): void};
	}
export function createIpc<MainToRendererEvent extends Record<string , IpcStructure.MainToRendererEvent<unknown[]>>>( type: 'mtrEvent' ):
	<Channel extends keyof MainToRendererEvent>( channel: Channel ) => {
		targets( targets: WebContents[] ): {
			send(...args: MainToRendererEvent[Channel]["args"] ): void;
		}
	}
export function createIpc( type: 'rpc' | 'rtmEvent' | 'mtrEvent' ) {
	switch( type ) {
		case 'rpc': {
			return <IpcRpc extends Record<string, IpcStructure.IpcRpc<unknown[], unknown>>, Channel extends string&keyof IpcRpc>(channel: Channel) => {
				return {
					handle(handler: ( meta: { event: IpcMainInvokeEvent } , ...payloads: IpcRpc[Channel]["payloads"] )=> IpcRpc[Channel]["response"]|Promise<IpcRpc[Channel]["response"]>){
						const disposer = useRegisterIpcRpc<IpcRpc,Channel>(channel,handler);
						return {
							disposer,
						}
					}
				};
			};
		}
		case 'rtmEvent': {
			return <RendererToMainEvents extends Record<string, IpcStructure.RendererToMainEvent<unknown[], {channel:string,args:unknown[]}>>,Channel extends string&keyof RendererToMainEvents>(channel: Channel) => {
				return {
					on: (handler:(
						meta: {
							event: IpcMainEvent,
							reply<ReplyChannel extends RendererToMainEvents[Channel]["reply"]['channel']>(channel: ReplyChannel): { send(...args: RendererToMainEvents[Channel]["reply"]['args']): void; }
						},
						...args: RendererToMainEvents[Channel]["args"]
					) => void) => {
						console.log(11111111);
						const disposer = useRegisterRtmEvent<RendererToMainEvents,Channel>(channel,handler);
						return {
							disposer
						}
					},
				};
			};
		}
		case 'mtrEvent': {
			return <MainToRendererEvent extends Record<string, IpcStructure.MainToRendererEvent<unknown[]>>,Channel extends string&keyof MainToRendererEvent>(channel: Channel) => {
				return {
					targets: (targets: WebContents[]): { send(...args: MainToRendererEvent[Channel]["args"]): void } => {
						return {
							send: (...args: MainToRendererEvent[typeof channel]["args"]): void => {
								targets.forEach(target => {
									try {
										target.send('JSON', { channel }, ...args);
									}catch ( e ) {
										debugger;
										throw e;
									}
								});
							},
						};
					},
				};
			};
		}
	}
}

const useRegisterIpcRpc = function(){
	const registry:{
		[channel in string]?:<Rpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>>,Channel extends keyof Rpc>(meta:{event:IpcMainInvokeEvent},...payloads:Rpc[Channel]["payloads"]) => Rpc[Channel]["response"] | Promise<Rpc[Channel]["response"]>
	} = {};
	
	ipcMain.handle('JSON',async (event,meta:{
		channel:string;
	}, ...payloads) => {
		if( !meta.channel ) {throw new Error('channel is required')};
		const registered = registry[meta.channel];
		try {
			return registered( { event } , ...payloads );
		} catch ( e ) {
			debugger;
			throw e;
			throwToMain(e);
		}
	});
	
	return <IpcRpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>>,Channel extends string&keyof IpcRpc>(channel:Channel,handler: ( meta: { event: IpcMainInvokeEvent } , ...payloads: IpcRpc[Channel]["payloads"] )=> void) => {
		const registered = registry[channel];
		if(registered){
			throw new Error('channel already registered');
		}
		registry[channel] = handler;
		return function disposer() {
			delete registry[channel];
		}
	}
}();

const useRegisterRtmEvent = function(){
	const registry:{
		[channel in string]?:Array<<RtmEvent extends {[p:string]:IpcStructure.RendererToMainEvent<unknown[] , {channel:unknown,args:unknown[]}>},Channel extends keyof RtmEvent>(meta:{event:IpcMainEvent,reply:unknown},...payloads:RtmEvent[Channel]["args"]) => void>
	} = {};
	
	ipcMain.on('JSON',async (event,meta:{
		channel:string;
	}, ...args) => {
		if( !meta.channel ) {throw new Error('channel is required')};
		
		console.log(`IpcRtm received message from channel<<${meta.channel}>>`);
		
		const reply = <RendererToMainEvents extends Record<string , IpcStructure.RendererToMainEvent<unknown[] , {channel:unknown,args:unknown[]}>> ,Channel extends keyof RendererToMainEvents>(channel:Channel) => {
			return {
				send(...args: RendererToMainEvents[Channel]["reply"]['args']){
					event.reply('JSON',{channel},...args);
				}
			}
		}
		const registered = registry[meta.channel];
		registered.forEach( ( handler ) => {
			try {
				handler( { event,reply } , ...args );
			} catch ( e ) {
				debugger;
				throw e;
			}
		} );
	});
	
	return <RendererToMainEvents extends Record<string , IpcStructure.RendererToMainEvent<unknown[] , { channel: unknown, args: unknown[] }>> , Channel extends string & keyof RendererToMainEvents>( channel: Channel , handler: ( meta: { event: IpcMainEvent, reply: ( channel: RendererToMainEvents[Channel]["reply"]['channel'] ) => { send( ...args: RendererToMainEvents[Channel]["reply"]['args'] ): void } } , ...args: RendererToMainEvents[Channel]["args"] ) => void ) => {		
		const registered = registry[channel];
		registered ? registered.push( handler ) : registry[channel] = [ handler ];
		return function disposer() {
			registry[channel] = registry[channel]!.filter( cb => cb !== handler );
		};
	};
	
}();

function throwToMain(e:any){
	throw e;
}

type Handler = {
	disposer():void;
}

import {
	ipcMain ,
	IpcMainEvent ,
	type IpcMainInvokeEvent ,
	type WebContents ,
} from 'electron';
import { IpcStructure } from './IpcStructure';
