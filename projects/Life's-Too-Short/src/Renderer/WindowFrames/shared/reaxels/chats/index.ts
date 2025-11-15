
export const Free_Chat_Symbol = Symbol('ecc16fa9-803f-4e8a-bfe4-2823acbaddf5');

if(typeof IPC !== 'undefined'){
	var {wsOn,wsSend} = await import('#renderer/WindowFrames/shared/reaxels/websocket-messager');
}

export const reaxel_Chats = reaxel( () => {
	
	const {
		store ,
		mutate ,
		setState,
	} = createReaxable( {
		"messages": [] as const as Message[],
		"chats" : [] as const as Chat[] ,
		"channels" : [] as Channel[] ,
		//当前所选中的chat
		current_chat_id : null as string,
		search_input_text : null,
		
		search : {
			search_text : '' ,
			scope : null as 'all' | 'free-chats' | 'all-channels' | string ,//string为某个channel_id
			get isSearching(){
				return !!store.search.search_text.trim() || !!store.search.scope;
			}
		} ,
		newChannel : {
			open : false,
			title: '',
			description: '',
			avatar: '',
			system_prompt: '',
			user_prompt: '',
			extra_data: {} as Record<string,any>,
			quick_prompts: [] as {
				group_id: string,
				selected: string,
				enabled : boolean,
			}[],
		}
	} );
	
	
	rehance_Initialize({
		store,
		setState,
		mutate,
	})();
	
	obsReaction(() => {
		console.log(!!store.search.search_text.trim());
	},() => [store.search.search_text])
	
	const {
		getFiltered,
		setFilterScope ,
		setFilterText,
	} = rehance_SearchAndFilter( {
		store:store.search ,
		setState:setState.search ,
	} )();
	
	const {toggleNewChannelModal,createChannel} = rehance_NewChannel({
		store:store.newChannel,
		setState:setState.newChannel,
	})();
	
	rehance_Initialize( {
		store ,
		setState ,
		mutate ,
	} )();
	
	wsOn?.( 'message::update' , async( data , code ) => {
		const oldMap = new Map( store.messages.map( m => [
			m.message_id ,
			m,
		] ) );
		const dataMap = new Map( data.messages.map( it => [
			it.message_id ,
			it,
		] ) );
		const newMessagesList: Message[] = [];
		
		// Collect new messages in the order they appear in data.messages
		for( const it of data.messages ){
			//新消息,放入队列等待合并
			if( !oldMap.has( it.message_id ) ) {
				newMessagesList.push( it as Message );
			} else {
				//旧消息,直接mutable修改
				const oldM = oldMap.get( it.message_id );
				mutate( () => {
					Object.assign( oldM , it );
				} );
				
			}
		}
		setState( {
			messages : [
				...newMessagesList ,
				...store.messages,
			],
		} );
	} );
	
	wsOn?.( 'channels::updated' , async( data ) => {
		const oldMap = new Map( store.channels.map( ch => [
			ch.channel_id ,
			ch,
		] ) );
		const dataMap = new Map( data.channels.map( ch => [
			ch.channel_id ,
			ch,
		] ) );
		const newChannels: Channel[] = [];
		const updatedChannels: Channel[] = [];
		
		// Collect new channels in the order they appear in data
		for( const ch of data.channels ){
			if( !oldMap.has( ch.channel_id ) ) {
				newChannels.push( ch );
			}
		}
		
		// Preserve original order for existing channels, applying updates where available
		for( const oldCh of store.channels ){
			if( dataMap.has( oldCh.channel_id ) ) {
				const newCh = dataMap.get( oldCh.channel_id );
				updatedChannels.push( newCh );
			} else {
				updatedChannels.push( oldCh );
			}
		}
		
		mutate( () => {
			store.channels = [
				...newChannels ,
				...updatedChannels,
			];
		} );
	} );
	
	wsOn?.( 'chats::update' , async( data ) => {
		const oldMap = new Map( store.chats.map( chat => [
			chat.chat_id ,
			chat,
		] ) );
		// const dataMap = new Map(data.map(chat => [chat.chat_id, chat]));
		const newChats: Chat[] = [];
		// Collect new chats in the order they appear in data
		for( const chat of data.chats ){
			//新增chat
			if( !oldMap.has( chat.chat_id ) ) {
				newChats.push( {
					chat_id : chat.chat_id ,
					// client_chat_id : chat.client_chat_id,
					disable_turn_context : chat.disable_turn_context ,
					created_at : chat.created_at ,
					fk_channel_id : chat.fk_channel_id ,
					is_free_chat : chat.is_free_chat ,
					chat_prompt : chat.chat_prompt ,
					current_node : null ,
					turn_state : 'idle' ,
					chat_title : chat.chat_id ,
					children : chat.children ,
					is_do_not_remember : chat.is_do_not_remember ,
				} );
			} else {
				//已有chat直接合并
				const oldChat = oldMap.get( chat.chat_id );
				mutate( () => {
					Object.assign( oldChat , chat );
				} );
			}
		}
		
		mutate( () => {
			store.chats = [
				...newChats ,
				...store.chats,
			];
		} );
	} );
	
	const rtn = {
		setCurrentChat(chat_id:string){
			setState({current_chat_id : chat_id});
		},
		//从某个节点开始删除该节点及其之后的所有消息
		deleteFromTurnInclusive(message_id:string){
			const chat_id = store.messages.find(it => it.message_id === message_id).fk_chat_id;
			wsSend( 'chat::delete_from_turn_inclusive' , {
				message_id ,
				chat_id ,
			} , 1 );
		},
		//rehance-search&filter
		getFiltered,
		setFilterScope ,
		setFilterText,
		//rehance-new-channel
		toggleNewChannelModal,
		createChannel,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );

import { IPC } from '#renderer/ENV/electron';
import { Chat } from '#src/types/Chat';
import { Message } from '#src/types/Message';
import { Channel } from '#src/types/Channel';
import { rehance_SearchAndFilter } from "#renderer/WindowFrames/shared/reaxels/chats/search&filter";
import { rehance_NewChannel } from '#renderer/WindowFrames/shared/reaxels/chats/new-channel';
import { rehance_Initialize } from "#renderer/WindowFrames/shared/reaxels/chats/initialize";
