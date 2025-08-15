/**
 * Channel是某个'主题',包含了所有与其相关的Chats
 */
export type Channel = {
	channel_id : string;
	channel_title:string;
	systemPrompt: string;
	customPrompts?: string[];
	created_at: number;
	archived?: boolean;
}







