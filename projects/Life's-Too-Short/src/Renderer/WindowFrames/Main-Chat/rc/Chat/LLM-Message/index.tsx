export const LLMMessage = reaxper( (props:LLMMessageProps) => {
	
	
	return <div className = { less.llmMessage }>
		<div className="md-content">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeHighlight]}
			>{
				props.contents.filter(content => content.type === 'text').map((it) => it.contents.join('\n\n')).join('\n\n')
			}</ReactMarkdown>
		</div>
	</div>;
} );

export type LLMMessageProps = {
	contents : (TextType|PictureType|FileType)[];
	format : "markdown"|"text"|"json"|"yaml";
}



type TextType = {
	type : 'text';
	contents : string[];
}
type PictureType = {
	type : 'picture',
	contents : (string|File)[];
}
type FileType = {
	type: 'file';
	contents : File[];
}


import ReactMarkdown from 'react-markdown';

import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';


import less from './index.module.less';
