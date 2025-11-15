export const reaxel_ElectronUpdater = reaxel(() => {
	
	autoUpdater.allowPrerelease = true;
	autoUpdater.forceDevUpdateConfig = true;
	if(dev()){
		autoUpdater.setFeedURL({
			provider: "github",
			owner: "Kane-Kuroneko",
			repo: "Life-s-Too-Short-AI-Release",
			releaseType: "prerelease"
		});
	}
	const {
		store ,
		setState,
		mutate,
	} = createReaxable( {
		updateInfo : null as UpdateCheckResult,
		
	} );
	const checkForUpate = async () => {
		
	}
	
	let rtn = {
		
		
	};
	
	IpcMainHandle( 'check-app-updates' ).handle( async() => {
		const result = await autoUpdater.checkForUpdatesAndNotify();
		if(result){
			console.log('autoUpdater.checkForUpdatesAndNotify()-> \n\n',result);
		}else {
			console.log('autoUpdater.checkForUpdatesAndNotify()-> \n\n','No Available Update!!');
		}
		return { result:_.omit(result,['cancellationToken','downloadPromise']) };
	} );
	
	IpcMainOn( 'apply-app-update' ).on( async() => {
		
		if(store.updateInfo){
			autoUpdater.downloadUpdate();
		}else {
			throw new Error('da78s5:暂无更新,检查代码流程');
		}
	} );
	
	autoUpdater.on('checking-for-update', () => {
		console.log('检查更新...');
	});
	
	autoUpdater.on('update-available', (info) => {
		console.log('发现新版本:', info.version);
	});
	
	autoUpdater.on('update-not-available', () => {
		console.log('当前已是最新版本');
	});
	
	autoUpdater.on('error', (err) => {
		console.error('更新出错:', err);
	});
	
	autoUpdater.on('download-progress', (progress) => {
		console.log(`下载进度: ${progress.percent.toFixed(2)}%`);
	});
	
	autoUpdater.on('update-downloaded', (info) => {
		console.log('更新下载完成:', info.version);
		// 这里弹窗提示用户安装
		dialog.showMessageBox({
			type: 'info',
			buttons: ['现在重启', '稍后'],
			defaultId: 0,
			message: `新版本 ${info.version} 已下载完成，是否立即安装？`,
		}).then(async result => {
			if (result.response === 0) {
				await import('../../tray').then( module => {
					module.tray.destroy();
				} );
				autoUpdater.quitAndInstall();
				quit('tray-exit');
			}
		});
	});
	
	return Object.assign( () => rtn , {
		store,
		setState,
		mutate,
	} );
} )

import { quit } from '#main/useQuitEvent';
import {
	IpcMainHandle ,
	IpcMainOn,
} from '#main/utils/useIPC';
import {
	autoUpdater ,
	UpdateCheckResult,
} from 'electron-updater';
import { dialog ,app} from 'electron';
import { dev } from 'electron-is';
