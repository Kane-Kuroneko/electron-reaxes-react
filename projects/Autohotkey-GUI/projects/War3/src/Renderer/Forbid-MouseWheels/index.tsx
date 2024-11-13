export const ForbidMouseWheels = reaxper(() => {
	const { GUI_Store, toggleWheelsZoom } = reaxel_GUI();
	const { language } = reaxel_I18n();
	return <FunctionSwitcher
		value = { GUI_Store.switch_forbidWheelsZoom }
		onChange = { toggleWheelsZoom }
	>
		<I18n>Disable wheel zoom</I18n>
		{I18nContent[language]}
	</FunctionSwitcher>;
});

class I18nContent {
	static 'zh-CN' = <IconPopoverDesc maxWidth={'560px'}>
		<span style={{lineHeight : '48px'}}>改为</span>
		<HotKey small>Shift</HotKey>+<HotKey small>滚轮</HotKey>
		<span>，也可以使用</span>
		<HotKey small>Page Up</HotKey>&#47;
		<HotKey small>Page Down</HotKey>
	</IconPopoverDesc>;
	
	static 'en-US' = <IconPopoverDesc maxWidth={'700px'}>
		<span style={{lineHeight : '38px'}}>Modified to </span>
		<HotKey small>Shift</HotKey> + <HotKey small>Mouse Wheel</HotKey>
		<span> , </span>
		<HotKey small>Page Up</HotKey>
		<span> &#47; </span>
		<HotKey small>Page Down</HotKey>
		<span style={{lineHeight : '38px'}}> are same.</span>
	</IconPopoverDesc>;
}

import { reaxel_GUI } from '../../reaxels/GUI';
import { reaxel_I18n } from '#reaxels/i18n';
import { FunctionSwitcher , IconPopoverDesc , HotKey } from '../../pure-components';
import {} from '@ant-design/icons';
