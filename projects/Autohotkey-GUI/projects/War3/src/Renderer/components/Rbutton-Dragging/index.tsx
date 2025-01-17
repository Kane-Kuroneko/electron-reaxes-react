export const RbuttonDragging = reaxper( () => {
	
	const {
		GUI_Store ,
		toggleRbtnDragging ,
		setDetectionDelay ,
		resetDetectionDelay ,
	} = reaxel_HotkeyEnhancer();
	const { language } = reaxel_I18n();
	
	return <>
		<FunctionSwitcher
			value = { GUI_Store.switch_RbtnDragging }
			onChange = { ( v ) => {
				toggleRbtnDragging( v );
			} }
		>
			<I18n>
				Enable Right Mouse Button Dragging
			</I18n>
		</FunctionSwitcher>
		<div className = { less['RbuttonModifier'] }>
			<span style = { { marginRight : "12px" } }>
				<I18n>Right-click detection delay</I18n>
			</span>
			<InputNumber
				value = { GUI_Store.input_detectionDelay }
				onBlur = { () => {
					setDetectionDelay( GUI_Store.input_detectionDelay );
				} }
				style = { {
					width : {
						'en-US' : '140px' ,
						'zh-CN' : '140px' ,
					}[language] ,
					transition : 'width 0s' ,
				} }
				onChange = { ( v ) => {
					setDetectionDelay( v );
					console.log( v );
				} }
				id = "YYYD"
				// controls = { false }
				suffix = "ms"
				addonBefore = { <Tooltip
					title = "重置为默认"
					trigger = "hover"
				>
					<InteractionTwoTone
						onClick = { ( e ) => {
							resetDetectionDelay();
						} }
						style = { {
							fontSize : 18 ,
							color : '#00c8ff' ,
						} }
					/>
				</Tooltip> }
			/>
			{ I18nElement[language] }
		</div>
	</>;
} );

class I18nElement {
	static language = reaxel_I18n().language;
	
	static 'zh-CN' = <IconPopoverDesc maxWidth = { '560px' }>
		<span style = { { lineHeight : '38px' } }>
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
	</IconPopoverDesc>;
	
	static 'en-US' = <IconPopoverDesc maxWidth = { '550px' }>
		<span style = { { lineHeight : '38px' } }>
			This value controls how many milliseconds between pressing and releasing
		</span>
		<HotKey small>Right Mouse Button</HotKey>
		<span>
			is considered a right-click command.
		</span>
		<br />
		<span style = { { fontWeight : "bold" } }>Too long,</span>
		<span> and it may lead to unintentional commands to units while dragging the screen.</span>
		<br />
		<span style = { { fontWeight : "bold" } }>Too short,</span>
		<span> and the right-click command might be ignored, mistaking it for screen dragging instead of a click.</span>
	</IconPopoverDesc>;
}

type props = React.PropsWithChildren<{
	content?: React.ReactNode,
	placement?: TooltipProps['placement']
}>;

import { reaxel_HotkeyEnhancer } from '#renderer/reaxels/hotkey-enhancer';
import { reaxel_I18n } from '#renderer/reaxels/i18n';
import { FunctionSwitcher , IconPopoverDesc , HotKey } from '#renderer/pure-components';
import { TooltipProps , InputNumber , Tooltip } from 'antd';
import { UndoOutlined , InteractionTwoTone } from '@ant-design/icons';

import * as less from './style.module.less';
