
/**
 * 用户与LLM对话的Turn List
 */
export const ChatThreadContainer = reaxper( () => {
	const {chat,chat_id,messages} = useChat();
	
	if(!chat) return null;
	// console.log(chat,chat_id,messages);
	
	const turns = messages.map(message => {
		if(message.author.role === 'assistant'){
			return <LLMMessage
				key={message.message_id}
				format = "markdown"
				contents={ message.contents }
			/>;
		}else if(message.author.role === 'user'){
			return <UserMessage
				key={message.message_id}
				contents={ message.contents }
			/>;
		}
		
	})
	
	return <div className={ less.chatThreadContainer }>
		{ turns }
	</div>;
} );
function normalizeMarkdown(raw: string): string {
	// 1. 将 JSON 字符串中的 \n 转换为换行
	let result = raw.replace(/\\n/g, '\n');
	
	// 2. 如果存在多余的转义（如 \"、\`），也可以进一步处理：
	result = result.replace(/\\"/g, '"').replace(/\\`/g, '`');
	
	return result;
}
import { UserMessage } from '#Main-Chat/rc/Chat/User-Message';
import { LLMMessage } from '#Main-Chat/rc/Chat/LLM-Message';
import { useChat } from "#Main-Chat/rc/Chat/useChat";
import ReactMarkdown from 'react-markdown';

import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import less from './index.module.less';
