export const MButtonToAtttack = reaxper( () => {
	
	const {
		GUI_Store ,
		toggleMbuttonToAttack,
	} = reaxel_GUI();
	const { language } = reaxel_I18n();
	console.log(language);
	return <>
		<FunctionSwitcher
			value = { GUI_Store.switch_MbtnToAttack }
			onChange = { toggleMbuttonToAttack }
		>
			{I18nElement.title[language]}
			
			<IconPopoverDesc>
				<span>按下鼠标中键即可对目标触发A + 鼠标左键攻击目标或地点<br/>开启后鼠标中键无法再拖拽屏幕</span>
			</IconPopoverDesc>
		</FunctionSwitcher>
	</>;
} );

class I18nElement {
	static language = reaxel_I18n().language;
	
	static title = {
		'en-US' : <span>
			Enable<HotKey small>Middle Button Click</HotKey>Replacement with<HotKey small>A + Left Click</HotKey>
		</span>,
		'zh-CN' : <span>
			启用<HotKey small>鼠标中键</HotKey>点击 替换为<HotKey small>A + 鼠标左键</HotKey>
		</span>
	}
}

type props = React.PropsWithChildren<{
	content?: React.ReactNode,
	placement?: TooltipProps['placement']
}>;

import { reaxel_GUI } from '../../reaxels/GUI';
import { reaxel_I18n } from '#reaxels/i18n';
import { TooltipProps , InputNumber , Tooltip } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { FunctionSwitcher , IconPopoverDesc , HotKey } from '../../pure-components';

import * as less from './style.module.less';
