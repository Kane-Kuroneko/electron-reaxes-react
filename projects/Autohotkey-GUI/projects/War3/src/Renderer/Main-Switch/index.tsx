export const MainSwitch = reaxper( () => {
	const { GUI_Store , toggleMainSwitch,toggleAutoSwitch } = reaxel_GUI();
	
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
			unCheckedChildren = { i18n( "Enable" ) }
			onChange = { toggleMainSwitch }
		/>
		<br />
		<label style={{display:"flex",justifyContent:'center',alignItems:'center'}}>
			<Checkbox 
				indeterminate={GUI_Store.checkbox_AutoSwitch}
				checked = {false}
				onChange={ (e) => toggleAutoSwitch(e.target.value) }
			/>
			<span style={{marginLeft : '12px',fontSize:14,}}>
				<I18n>Auto Enable/Disable Main Switch Once Game Process Started/Closed</I18n>
			</span>
		</label>
	</div>;
} );
import { reaxel_GUI } from '../../reaxels/GUI';

type props = React.PropsWithChildren<{}>;

import { Switch ,Checkbox} from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import * as less from './style.module.less';
