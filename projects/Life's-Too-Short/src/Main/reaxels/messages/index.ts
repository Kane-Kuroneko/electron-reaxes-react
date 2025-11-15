export const reaxel_Messages = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate ,
		
	} = createReaxable( {
		messages : [] as Message[] ,
	} );
	
	const rtn = {
		pushMessage(...messages:Message[]){
			const deduped = [];
			for(let i = 0 ;i < messages.length;i++){
				const newMessage = messages[i];
				
				for(let j = 0 ; j < store.messages.length ; j++){
					if(store.messages[j].message_id === newMessage.message_id){
						store.messages[j] = newMessage;
						break;
					}else if(j === store.messages.length-1 && store.messages[j].message_id !== newMessage.message_id){
						deduped.push( newMessage );
					}
				}
			}
			store.messages.push( ...deduped );
		},
		delMessage(...messageIds: string[]) {
			const preserved = store.messages.filter(m => !messageIds.includes(m.message_id));
			setState({
				messages: preserved,
			});
		}
		
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );


import { Message } from '#src/types/Message';
