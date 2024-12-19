export const FloatResetAllConf = reaxper(() => {
	
	
	return <Tooltip
		placement = "top"
		title = { i18n( 'Reset All' ) }
	>
		<FloatButton
			icon = { <SVG_Reset style={{transform:'scale(.84)'}} /> }
			shape = "square"
			style = { {
				left : 80 ,
				bottom : 24 ,
				zIndex : 1000 ,
			} }
		/>
	</Tooltip>;
})

import { SVG_Reset } from '#project/src/Renderer/pure-components/SVG/Reset.component';
import { FloatButton , Tooltip } from 'antd';
