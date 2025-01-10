export const MButtonToAtttack = reaxper( () => {
	
	const {
		GUI_Store ,
		toggleMbuttonToAttack,
	} = reaxel_GUI();
	const { language } = reaxel_I18n();
	
	return <>
		<FunctionSwitcher
			value = { GUI_Store.switch_MbtnToAttack }
			onChange = { toggleMbuttonToAttack }
		>
			{I18nElement.title[language]?.()}
			
			<IconPopoverDesc>
				{I18nElement.desc[language]?.()}
			</IconPopoverDesc>
		</FunctionSwitcher>
	</>;
} );

class I18nElement {
	static language = reaxel_I18n().language;
	
	static desc = {
		'zh-CN'(){
			return <>
				<div>按下鼠标中键即可对目标触发<HotKey small>A + 鼠标左键</HotKey>攻击目标或地点</div>
				<div>开启后鼠标中键无法再拖拽屏幕</div>
			</>;
		},
		'en-US'() {
			return <>
				<div>Press the middle mouse button to trigger <span style={{whiteSpace:'nowrap'}}><HotKey small>A + Left Mouse Button</HotKey></span> to attack the target or location.</div>
				<div>Once enabled, the middle mouse button can no longer be used to drag the screen.</div>
			</>;
		},
	}
	
	static title = {
		'en-US'() {
			return <span>
				Enable<HotKey small>Middle Button Click</HotKey>Replacement with<HotKey small>A + Left Click</HotKey>
			</span>;
		} ,
		'zh-CN'() {
			return <span>
				启用<HotKey small>鼠标中键</HotKey>点击 替换为<HotKey small>A + 鼠标左键</HotKey>
			</span>;
		} ,
	}
}

type props = React.PropsWithChildren<{
	content?: React.ReactNode,
	placement?: TooltipProps['placement']
}>;

import { reaxel_GUI } from '#renderer/reaxels/hotkey-enhancer';
import { reaxel_I18n } from '#renderer/reaxels/i18n';
import { TooltipProps , InputNumber , Tooltip } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { FunctionSwitcher , IconPopoverDesc , HotKey } from '#renderer/pure-components';

import * as less from './style.module.less';
