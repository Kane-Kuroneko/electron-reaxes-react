export const SporesBar = reaxper( () => {
	const { Core_Store } = reaxel_Core();
	return <div
		style = { {
			display : "flex" ,
			flexFlow : 'column nowrap' ,
			alignItems : 'center' ,
			padding : '20px 0' ,
		} }
	>
		{ Core_Store.spores.map( ( spore , index ) => {
			return <React.Fragment key={spore.url}>
				{ index !== 0 ? <Divider style={{margin : '12px 0'}} /> : null }
				<SporeRC
					key = { spore.url }
					spore = { spore }
				/>
			</React.Fragment>;
		} ) }
	</div>;
} );
import Divider , {} from 'antd/es/divider';
import { SporeRC } from '../spore';
import { reaxel_Core } from '#renderer/AllocatorView/reaxels/core';
import Button , {} from 'antd/lib/button';
import * as less from './index.module.less';
