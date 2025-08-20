export const AppVersion = reaxper( () => {
	
	const { checkForUpdates } = reaxel_Updater();
	
	return <div className={less.appVersion}>
		<span>当前应用版本:</span>
		<Tag className="ver">{ IPC.info.app_version }</Tag>
		<Button
			onClick={() => {
				checkForUpdates();
			}}
			size="small"
			type="link"
		>{ reaxel_Updater.store.checking ? '正在检查..' : '检查更新' }</Button>
	</div>;
} );

import less from './style.module.less';
import { Tag , Button } from 'antd';
import { UpdateIcon } from '#Main-Chat/rc/Update-Icon/index';
import { reaxel_Updater } from '#Main-Chat/reaxels/updater';
