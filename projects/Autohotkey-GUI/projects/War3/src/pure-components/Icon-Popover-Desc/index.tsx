export const IconPopoverDesc = reaxper( ( props: props ) => {
	
	
	return <Popover
		trigger = { [ 'click' ] }
		content = { props.children }
		overlayClassName = { less['popoverConent'] }
		placement = { props.placement }
	>
		<InfoCircleTwoTone className = { less['description-icon'] } />
	</Popover>;
} );


type props = React.PropsWithChildren<{
	content? : React.ReactNode,
	placement? : TooltipProps['placement']
}>;

import { Popover , TooltipProps } from 'antd';
import { InfoCircleTwoTone } from '@ant-design/icons';
import * as less from './style.module.less';
