export const RbuttonDragging = reaxper( () => {
	
	const {
		GUI_Store ,
		toggleRbtnDragging ,
		setDetectionDelay ,
		resetDetectionDelay ,
	} = reaxel_GUI();
	
	const [input,setInput] = useState(GUI_Store.input_detectionDelay)
	
	return <>
		<FunctionSwitcher
			value = { GUI_Store.switch_RbtnDragging }
			onChange = { toggleRbtnDragging }
		>
			开启鼠标右键拖拽屏幕
		</FunctionSwitcher>
		<div className = { less['RbuttonModifier'] }>
			<span>右键检测延迟(ms)</span>
			<InputNumber
				value = { GUI_Store.input_detectionDelay }
				onBlur = { () => {
					setDetectionDelay( input );
				} }
				onChange={(v) => setInput(v)}
				id = "YYYD"
				controls = { false }
				suffix = { <Tooltip
					title = "重置为默认"
				>
					<UndoOutlined
						onClick = { ( e ) => {
							e.stopPropagation();
							e.preventDefault();
							resetDetectionDelay();
							alert( 'sssssss' );
						} }
						style = { {
							fontSize : '12px' ,
							color : '#00c8ff' ,
						} }
					/>
				</Tooltip> }
			/>
			<IconPopoverDesc>
				<span>
					这个值控制
				</span>
				<HotKey small>鼠标右键</HotKey>
				<span>
					从按下到弹起多少ms内视为一次右键点击指令
				</span>
				<br />
				<span style = { { fontWeight : "bold" } }>过长</span>
				<span>会导致右键拖拽画面时误对部队下令移动</span>
				<br />
				<span style = { { fontWeight : "bold" } }>过短</span>
				<span>会导致右键下令被忽略从而误认为是在拖拽画面而非点击</span>
			</IconPopoverDesc>
		</div>
	</>;
} );

type props = React.PropsWithChildren<{
	content?: React.ReactNode,
	placement?: TooltipProps['placement']
}>;

import { reaxel_GUI } from '../../reaxels/GUI';
import { TooltipProps , InputNumber , Tooltip } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { FunctionSwitcher , IconPopoverDesc , HotKey } from '../../pure-components';

import * as less from './style.module.less';
