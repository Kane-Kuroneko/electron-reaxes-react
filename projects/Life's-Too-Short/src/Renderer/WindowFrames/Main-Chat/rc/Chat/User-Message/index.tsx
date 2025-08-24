
export const UserMessage = reaxper( (props:UserMessageProps) => {
	return <div className = { less.userMessageContainer }>
		<div
			className="content"
		>
			{props.contents.reduce((accu,message) => {
				if(message.type === 'text'){
					return accu.concat( message.contents.join('\n\n') );
				}
			},'')}
		</div>
	</div>;
} );

export type UserMessageProps = {
	contents?: MessageContent[];
};

export type MessageContent =
	| TextContent
	| FileContent;

export type TextContent = {
	type: 'text';
	contents: string[];
};
export type FileContent = {
	type: 'file';
	contents: {
		name: string;
		size: number;
		mime: string;
		url?: string; // 可用于预览
		raw?: File;   // 若仍保留原始 File 对象
	}[];
};

import less from './index.module.less';

