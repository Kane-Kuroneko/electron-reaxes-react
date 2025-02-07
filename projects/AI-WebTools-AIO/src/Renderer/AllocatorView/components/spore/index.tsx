export const SporeRC = reaxper( ( {spore}: {
	spore : Spore,
} ) => {
	const urlObj = new URL( spore.url );
	return <Button
		draggable
		onDragStart={(event) => {
			event.dataTransfer.setData('application/json' , JSON.stringify(spore));
		}}
		shape = "circle"
		style = { {
			width : 56 ,
			height : 56 ,
			margin : 0 ,
			padding : 0 ,
			overflow : 'hidden' ,
			
		} }
	>
		<img
			draggable = { false }
			src = { `https://icons.duckduckgo.com/ip3/${ urlObj.host }.ico` }
			width = "56"
			height = "56"
		/>
	</Button>;
} );

import { reaxel_Core , Spore } from '#renderer/AllocatorView/reaxels/core';
import Button,{} from 'antd/lib/button';
import * as less from './index.module.less';
