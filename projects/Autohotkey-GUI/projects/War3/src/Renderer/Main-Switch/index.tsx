export const MainSwitch = reaxper( () => {
	const { GUI_Store , toggleMainSwitch } = reaxel_GUI();
	
	return <div className = { less['mainSwitchContainer'] }>
		<Switch
			value = { GUI_Store.switch_main }
			className = "main-switch"
			// className = "stop-change"
			checkedChildren = { <span style = { { marginLeft : '6px' } }>改键生效中 <LoadingOutlined /></span> }
			unCheckedChildren = "开启改键"
			onChange = { toggleMainSwitch }
		/>
	</div>;
} );
import { reaxel_GUI } from '../../reaxels/GUI';

type props = React.PropsWithChildren<{}>;

import { Switch } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import * as less from './style.module.less';
