export const FloatLog = reaxper( () => {
	
	return <Tooltip
		placement = "top"
		title = { i18n( 'View Log' ) }
	>
		<FloatButton
			icon = { <SVG_Log /> }
			shape = "square"
			style = { {
				left : 24 ,
				bottom : 24 ,
				zIndex : 1000
			} }
		/>
	</Tooltip>;
} );

import { SVG_Log } from '#renderer/pure-components/SVG/Log.component';
import { FloatButton , Tooltip } from 'antd';

