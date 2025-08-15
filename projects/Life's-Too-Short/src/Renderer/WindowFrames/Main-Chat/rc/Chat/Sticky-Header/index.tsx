export const StickyHeader = reaxper(() => {
	
	return <header className={less.chatStickyHeader}>
		<h2 className="title">{"Learn English"}</h2>
		<PromptBox/>
	</header>
})


import { PromptBox } from '#Main-Chat/rc/Chat/Prompt-Box';
import less from './index.module.less';
