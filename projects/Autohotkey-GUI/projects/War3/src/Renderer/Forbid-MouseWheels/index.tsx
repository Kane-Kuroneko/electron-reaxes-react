export const ForbidMouseWheels = reaxper(() => {
	const { GUI_Store , toggleWheelsZoom } = reaxel_GUI();
	
	return <FunctionSwitcher
		value = {GUI_Store.switch_forbidWheelsZoom}
		onChange={toggleWheelsZoom}
	>
		禁止滚轮缩放视角
		<IconPopoverDesc>
			<span>改为</span>
			<HotKey small>Shift</HotKey>+
			<HotKey small>滚轮</HotKey>
			<span>，也可以使用</span>
			<HotKey small>Page Up</HotKey>&#47;
			<HotKey small>Page Down</HotKey>
		</IconPopoverDesc>
	</FunctionSwitcher>
} )

import { reaxel_GUI } from '../../reaxels/GUI';
import { FunctionSwitcher , IconPopoverDesc ,HotKey} from '../../pure-components';
import {} from '@ant-design/icons';
