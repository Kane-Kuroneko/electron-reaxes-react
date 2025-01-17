export const SegmentedSwitcher = reaxper( () => {
	const { GUI_Core_Store , GUI_Core_SetState } = reaxel_GUI_Core();
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
			value = { GUI_Core_Store.hash.replaceAll( '#' , '' ) }
			options = { options }
			onChange = { ( value ) => {
				GUI_Core_SetState( { hash : value } );
			} }
		/>
		
		<Divider />
	</div>;
} );

import { reaxel_GUI_Core } from '#renderer/reaxels/core';
import { Segmented , Divider } from 'antd';
import * as less from './style.module.less';
