export const getTextSizeByPyScreenInfo = async () => {
	const { absAppStaticsPath } = reaxel_ElectronENV();
	return new Promise<PhysicalScreen[]>((resolve,reject) => {
		const cp = spawn(path.join(absAppStaticsPath,'assets/py_screen_info/screen_info.exe'));
		cp.stdout.on('data',(data:Buffer) => {
			console.log('fffffffffffffg',data.toString());
			resolve(JSON.parse(data.toString()));
		});
		cp.stdout.on('error' , (e) => {
			console.error();
			reject(e);
		});
	})
}

import type { PhysicalScreen } from '../utils';
import { spawn } from 'node:child_process';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import path from 'node:path'
