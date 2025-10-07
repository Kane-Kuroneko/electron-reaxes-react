export namespace WS_Channel {
	export namespace ClientSend {
		export type New = {
			client_channel_id:string;
			title:string;
			description?:string;
			avatar?:string;
			system_prompt?:string;
			user_prompt?:string;
			extra_data?:Record<string,any>;
			quick_prompts?:string[];
			addons?:string[];
		}
		export type Update = {
			channel_id:string;
			title?:string;
			description?:string;
			avatar?:string;
			system_prompt?:string;
			user_prompt?:string;
			extra_data?:Record<string,any>;
			quick_prompts?:string[];
			addons?:string[];
		}
		
		export type Delete = {
			channel_id:string;
		}
	}
	export namespace ServerSend {
		export type update = {
			channels : Channel[];
		}
	}
}

import { type Model } from '#src/types/Model';
import { type Message } from '#src/types/Message';
import { type Channel } from '#src/types/Channel';
import { type Chat } from '#src/types/Chat';
