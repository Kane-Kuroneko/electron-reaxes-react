export const MainSwitch = reaxper( () => {
	const { GUI_Store , toggleMainSwitch } = reaxel_GUI();
	
	return <div className = { less['mainSwitchContainer'] }>
		<Switch
			value = { GUI_Store.switch_main }
			className = "main-switch"
			// className = "stop-change"
			checkedChildren = { <span style = { { marginLeft : '6px' } }>
				<I18n>Activing</I18n>   
				&nbsp;
				<LoadingOutlined />
			</span> }
			unCheckedChildren = {i18n("Enable")}
			onChange = { toggleMainSwitch }
		/>
	</div>;
} );
import { reaxel_GUI } from '../../reaxels/GUI';

type props = React.PropsWithChildren<{}>;

import { Switch } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import * as less from './style.module.less';
