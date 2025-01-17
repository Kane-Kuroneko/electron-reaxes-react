export let windowsTextScale ;
try {
	windowsTextScale = parseFloat(execSync(
		'powershell -Command "[Windows.UI.ViewManagement.UISettings]::new().TextScaleFactor"'
	).toString().trim())
}catch ( e ) {
	console.error('使用powershell获取windowsTextScale失败');
	debugger;
}

import { execSync } from 'child_process';
