export let windowsTextScale;

try {
	const { windowsTextScale : scale } = await import('./powershell-style');
	if(checkValidScale(scale)){
		windowsTextScale = scale;
	}else {
		debugger;
		throw new Error('错误的windowsTextScale via ps1:' ,scale);
	}
}catch ( e ) {
	debugger;
	console.error( e );
	const { windowsTextScale : scale } = await import('./registry-style');
	if(checkValidScale(scale)){
		windowsTextScale = scale;
	}else {
		debugger;
		throw new Error( '竟然连注册表也获取不到windowsTextScale' , scale );
	}
}

function checkValidScale (scale:number){
	return typeof scale === 'number' && !Number.isNaN(scale) && scale >= 1
}

import { windowsTextScale as powershellStyle } from './powershell-style';
import { windowsTextScale as registryStyle } from './registry-style';
