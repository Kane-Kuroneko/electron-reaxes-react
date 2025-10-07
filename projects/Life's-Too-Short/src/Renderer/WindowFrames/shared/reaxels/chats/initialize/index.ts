
export const rehance_Initialize = ({
	store,
	setState,
	mutate,
}) => () => {
	
	wsSend('mcc::get[all]',null,1);
	
	wsOn( 'mcc::get[all]' , ( data ) => {
		setState( {
			chats : data.chats ,
			channels : data.channels ,
			messages : data.messages ,
		} );
	} );
	
	return {};
}


type ReaxelChat = Pick<typeof import('../').reaxel_Chats , "store" | "setState" | "mutate">;
import {
	wsOn ,
	wsSend,
} from "#renderer/WindowFrames/shared/reaxels/websocket-messager";
