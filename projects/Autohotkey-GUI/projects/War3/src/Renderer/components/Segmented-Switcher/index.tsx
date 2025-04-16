export const SegmentedSwitcher = reaxper( () => {
	
	const options = [
		{
			label : i18n( 'Hotkey-Enhancer' ) ,
			value : '/hotkey-enhancer' ,
		} ,
		{
			label : i18n( 'Cheats' ) ,
			value : '/cheats' ,
		} ,
	];
	
	return <div className = { less.segementedSwitcher }>
		<Segmented
			value = { reaxel_GUI_Core.store.hash.replaceAll( '#' , '' ) }
			options = { options }
			onChange = { ( value ) => {
				reaxel_GUI_Core.setState( { hash : value } );
			} }
		/>
		
		<Divider />
	</div>;
} );

import { reaxel_GUI_Core } from '#renderer/reaxels/core';
import { Segmented , Divider } from 'antd';
import * as less from './style.module.less';
