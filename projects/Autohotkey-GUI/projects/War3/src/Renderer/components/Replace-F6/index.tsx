export const ReplaceF6 = reaxper( () => {
	
	const { GUI_Store , toggleReplaceF6 } = reaxel_GUI();
	
	return <>
		<FunctionSwitcher
			value = { GUI_Store.switch_replaceF6 }
			onChange = { toggleReplaceF6 }
		>
			<I18n>Replace F6 quick save with timestamped save</I18n>
			<IconPopoverDesc placement = "bottom">
				<img
					src = { gif }
					width = "300"
					height = "300"
				/>
			</IconPopoverDesc>
		</FunctionSwitcher>
		<SpaceF6SaveToSpecial/>
	</>;
} );

import { SpaceF6SaveToSpecial } from './Space&F6-Save-To-Special';
import { reaxel_GUI } from '#reaxels/GUI';
import { FunctionSwitcher , IconPopoverDesc ,HotKey} from '#project/src/Renderer/pure-components';
import {} from '@ant-design/icons';
import gif from './sd.gif';
