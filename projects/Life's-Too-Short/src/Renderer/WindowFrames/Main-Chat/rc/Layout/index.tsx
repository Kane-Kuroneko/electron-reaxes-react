export const Layout = reaxper( () => {
	
	
	return <div className = { less['layout'] }>
		<div className = "sidebar-left">
			<ChannelContainer/>
			<UpdateIcon
				style = { {
					zoom : '0.5' ,
				} }
			/>
			<AppVersion />
		</div>
		<ChatView/>
		<FloatBottomRight/>
	</div>;
} );

export const ChannelList = reaxper( ( {
	channel_title ,
	channel_id ,
	chats ,
	
}: ChannelProps ) => {
	
	return <Tree
		onClick = { ( e , node ) => {
			console.log( e , node );
		} }
		expandAction = { 'click' }
		selectable = { false }
		
		treeData = { [
			{
				selectable : false ,
				key : channel_id ,
				title : <span style = { { userSelect : 'none' } }>{ channel_title }</span> ,
				children : chats.map( ( chat , index ) => {
					
					return {
						key : chat.chat_id + `.${ index }` ,
						title : <span style = { { userSelect : 'none' } }>{ chat.chat_title }</span> ,
						selectable : true ,
					};
				} ) ,
				
			} ,
		] }
		onSelect = { ( keys , info ) => {
			console.log( keys , info.node.key );
		} }
	/>;
} );


export type ChannelProps = {
	channel_title: string;
	channel_id: string;
	chats: Chat[],
	
}

import { FloatBottomRight } from '#Main-Chat/rc/Float-Btn-Group/Bottom-Right';
import {ChatView} from '#Main-Chat/rc/Chat';
import { ChannelContainer } from '#Main-Chat/rc/Channel-Sider';
import { AppVersion } from '#Main-Chat/rc/App-Version';
import { UpdateIcon } from '#Main-Chat/rc/Update-Icon';
import { UserInputArea } from '#Main-Chat/rc/Chat/User-Input-Area';
import { ChatThreadContainer } from '#Main-Chat/rc/Chat/Chat-Thread-Container';
import type { Message } from '#src/types/Message';
import type { Channel } from '#src/types/Channel';
import type { Chat } from '#src/types/Chat';
import {
	Collapse ,
	Input ,
	Button ,
	Select ,
	Tree,
} from 'antd';
import less from './index.module.less';
