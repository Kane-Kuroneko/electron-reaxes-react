export const ReplaceF6 = reaxper( () => {
	
	const { GUI_Store , toggleReplaceF6 } = reaxel_GUI();
	
	return <FunctionSwitcher
		value = { GUI_Store.switch_replaceF6 }
		onChange = { toggleReplaceF6 }
	>
		替换F6快速保存为以时间戳命名的存档
		<IconPopoverDesc placement = "bottom">
			<img
				src = { gif }
				width = "300"
				height = "300"
			/>
		</IconPopoverDesc>
	</FunctionSwitcher>;
} );

import { reaxel_GUI } from '../../reaxels/GUI';
import { FunctionSwitcher , IconPopoverDesc ,HotKey} from '../../pure-components';
import {} from '@ant-design/icons';
import gif from './sd.gif';
