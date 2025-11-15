

export const rehance_MCCGetAll = ({
	store,
	setState,
	mutate,
}: ReaxelChat) => () => {
	
	wssOn('mcc::get[all]',() => {
		wssSend('mcc::get[all]',{
			chats:_.cloneDeep(store.chats),
			messages:_.cloneDeep(store.messages),
			channels:_.cloneDeep(store.channels),
		},1);
	});

	return {};
};

type ReaxelChat = Pick<typeof import('../').reaxel_Chat, "store" | "setState" | "mutate">;

import { WS_MCC } from "#src/types/ws-data-transfer/mcc";
import {
	wssOn ,
	wssSend,
} from '#main/services/wss-messager';
