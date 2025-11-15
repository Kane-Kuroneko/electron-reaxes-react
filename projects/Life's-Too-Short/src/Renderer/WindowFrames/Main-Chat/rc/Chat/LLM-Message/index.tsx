

export const LLMMessage = reaxper( (props:LLMMessageProps) => {
	
	return <div className = { less.llmMessage }>
		<div className="md-content">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeHighlight]}
			>{
				props.contents.filter(content => content.type === 'text').map((it) => it.text).join('\n\n')
			}</ReactMarkdown>
		</div>
	</div>;
} );

export type LLMMessageProps = {
	contents : Message.MessageContent[];
	format : "markdown"|"text"|"json"|"yaml";
}


import ReactMarkdown from 'react-markdown';

import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

import { Message } from "#src/types/Message";
import less from './index.module.less';
