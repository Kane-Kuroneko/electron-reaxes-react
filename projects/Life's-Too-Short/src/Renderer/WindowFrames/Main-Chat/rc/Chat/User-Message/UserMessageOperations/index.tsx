export const UserMessageOperations = reaxper( ( props: UserMessageOperationsProps ) => {
	
	const message = reaxel_Chats.store.messages.find( it => it.message_id === props.message_id );
	
	const {} = reaxel_Chats();
	
	return <div className="operation-container">
		<UserMessageButton
			title="复制"
			operation="copy"
			onClick={() => {
				const text = message?.contents.filter(content => content.type === 'text').map((it) => it.text).join('\n\n') || '';
				navigator.clipboard.writeText(text).then(() => {
					// 复制成功后的操作
					console.log('文本已复制到剪贴板');
				}).catch(err => {
					// 复制失败后的操作
					console.error('无法复制文本: ', err);
				});
			}}
		/>
		<UserMessageButton
			title="编辑"
			operation="edit"
			onClick={() => {
				
				if(typeof props.onDelete === 'function'){
					props.onEdit();
				}
			}}
		/>
		<UserMessageButton
			title="删除"
			operation="delete"
			onClick={() => {
				
				if(typeof props.onDelete === 'function'){
					props.onDelete();
				}
			}}
		/>
	</div>;
} );

export type UserMessageOperationsProps = {
	message_id: string;
	onDelete?: () => void;
	onEdit?: () => void;
	onCopy?: () => void;
};

import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import { Message } from "#src/types/Message";
import { UserMessageButton } from "#Main-Chat/rc/Chat/User-Message/UserMessageButton";

import less from './style.module.less';
