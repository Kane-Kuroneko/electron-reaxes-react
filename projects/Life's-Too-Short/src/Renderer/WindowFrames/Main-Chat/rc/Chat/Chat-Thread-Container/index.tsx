
/**
 * 用户与LLM对话的Turn List
 */
export const ChatThreadContainer = reaxper( () => {
	return <div className={less.chatThreadContainer}>
		<UserMessage contents={[
			{
				type : 'text',
				text : "但是用react-markdown无法直接渲染整个字符串 , 还需要判断有哪些来渲染为md , 有没有什么方式整体渲染 无需判断?"
			}
		]}/>
		<LLMMessage/>
	</div>
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

import ReactMarkdown from 'react-markdown';

import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import less from './index.module.less';
