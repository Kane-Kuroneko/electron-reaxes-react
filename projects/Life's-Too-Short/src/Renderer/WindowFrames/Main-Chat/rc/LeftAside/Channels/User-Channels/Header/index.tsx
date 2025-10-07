import { useContextMenu } from "#Main-Chat/rc/LeftAside/Channels/useContextMenu";

export const ChannelHeader = reaxper( () => {
	const { toggleNewChannelModal } = reaxel_Chats();
	
	const {
		handleContextMenu ,
		ContextMenu ,
	} = useContextMenu( {
		menuItems : [
			{
				key : 'search' ,
				label : 'Search In All Channels' ,
				
				onClick(){
					reaxel_Chats().setFilterScope('all-channels' );
				}
			} ,
			{
				key : '1' ,
				label : 'New Channel' ,
				onClick : () => {
					toggleNewChannelModal();
				} ,
			} ,
			{
				key : '2' ,
				label : 'Collapse All' ,
				onClick : () => {
					console.log( '点击了选项 2' );
				} ,
			} ,
		] ,
	} );
	
	return <div
		className={ less.channelHeader }
		onContextMenu={ handleContextMenu( () => {} ) }
	>
		<ContextMenu />
		<span className="title-container">
			<ChannelIconSvg/>
			<span className="title">Channels</span>
		</span>
		<span
			className="icon"
			title="collapse all"
		>
			<svg
				style={{width:22,height:22}}
				viewBox="0 0 1024 1024"
				version="1.1"
				xmlns="http://www.w3.org/2000/svg"
				p-id="3000"
				width="256"
				height="256"
			>
				<path
					d="M725.333333 128h-85.333333v85.333333h-85.333333v85.333334h-85.333334V213.333333H384V128H298.666667v85.333333h85.333333v85.333334h85.333333v85.333333h85.333334V298.666667h85.333333V213.333333h85.333333V128zM170.666667 554.666667h682.666666v-85.333334H170.666667v85.333334z m384 170.666666h-85.333334v-85.333333h85.333334v85.333333z m85.333333 85.333334h-85.333333v-85.333334h85.333333v85.333334z m0 0h85.333333v85.333333h-85.333333v-85.333333z m-256 0h85.333333v-85.333334H384v85.333334z m0 0H298.666667v85.333333h85.333333v-85.333333z"
					p-id="3001"
				></path>
			</svg>
		</span>
	</div>;
} );


import less from './style.module.less';
import {Input} from 'antd';
import {} from '@ant-design/icons';
import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import { ChannelIconSvg } from "#renderer/WindowFrames/shared/rc/SVG.Component/Channel-Icon.svg";

