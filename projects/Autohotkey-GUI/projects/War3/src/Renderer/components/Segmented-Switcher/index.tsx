export const SegmentedSwitcher = reaxper( () => {
	const { GUI_Store , GUI_SetState } = reaxel_GUI();
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
			value = { GUI_Store.hash.replaceAll( '#' , '' ) }
			options = { options }
			onChange = { ( value ) => {
				GUI_SetState( { hash : value } );
			} }
		/>
		
		<Divider />
	</div>;
} );

import { reaxel_GUI } from '#renderer/reaxels/hotkey-enhancer';
import { Segmented , Divider } from 'antd';
import * as less from './style.module.less';
