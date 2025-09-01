import { Message } from "#src/types/Message";

export const UserMessage = reaxper( (props:UserMessageProps) => {
	return <div className = { less.userMessageContainer }>
		<div
			className="content"
		>
			{
				props.contents.filter(content => content.type === 'text').map((it) => it.text).join('\n\n')
			}
		</div>
	</div>;
} );

export type UserMessageProps = {
	contents?: Message.MessageContent[];
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

