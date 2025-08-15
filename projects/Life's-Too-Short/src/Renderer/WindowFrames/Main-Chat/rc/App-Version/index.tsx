export const AppVersion = reaxper( () => {
	
	const { checkForUpdates } = reaxel_Updater();
	
	return <div>
		<span>当前应用版本:</span>
		<Tag>{ IPC.info.app_version }</Tag>
		<Button
			onClick={() => {
				checkForUpdates();
			}}
		>{ reaxel_Updater.store.checking ? '正在检查..' : '检查更新' }</Button>
	</div>;
} );

import { Tag , Button } from 'antd';
import { UpdateIcon } from '#Main-Chat/rc/Update-Icon/index';
import { reaxel_Updater } from '#Main-Chat/reaxels/updater';
