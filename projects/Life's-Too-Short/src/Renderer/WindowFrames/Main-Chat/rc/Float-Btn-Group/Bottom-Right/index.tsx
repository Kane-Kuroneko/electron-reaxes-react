const { Group } = FloatButton;

export const FloatBottomRight = reaxper(() => {
	
	return <Group
		shape="square"
		
	>
		<FloatButton
			shape="square"
			icon={<InfoCircleTwoTone />}
			tooltip={`当前版本:${IPC.info.app_version}`}
		>
			当前版本:{IPC.info.app_version}
		</FloatButton>
	</Group>
})

import less from './style.module.less';
import { FloatButton } from 'antd';
import {InfoCircleTwoTone} from '@ant-design/icons';
import {} from '#Main-Chat/reaxels/updater';
