export const getWindowsTextScale = async () => {
	try {
		const scale = await getWindowsTextScaleByReg().catch( e => null as number );
		if(checkValidScale(scale)){
			return scale;
		}else {
			debugger;
			throw new Error( '注册表无法获取windowsTextScale' , {cause:scale} );
		}
	}catch ( e ) {
		console.log( e );
		const scale = getWindowsTextScaleByPS();
		if(checkValidScale(scale)){
			return Promise.resolve(scale);
		}else throw new Error(`错误的windowsTextScale via ps1:`,{cause:scale});
	}
	
}

function checkValidScale (scale:number){
	return typeof scale === 'number' && !Number.isNaN(scale) && scale >= 1
}

import { getWindowsTextScaleByPS } from './powershell-style';
import { getWindowsTextScaleByReg } from './registry-style';

