import { useChat } from "#Main-Chat/rc/Chat/useChat";

export const StickyHeader = reaxper(() => {
	const {
		chat_id ,
		chat ,
		messages,
	} = useChat();
	if(!chat) return null;
	
	return <header className={less.chatStickyHeader}>
		<h2 className="title">{chat.chat_title}</h2>
		<PromptBox/>
	</header>
})


import { PromptBox } from '#Main-Chat/rc/Chat/Prompt-Box';
import less from './index.module.less';
