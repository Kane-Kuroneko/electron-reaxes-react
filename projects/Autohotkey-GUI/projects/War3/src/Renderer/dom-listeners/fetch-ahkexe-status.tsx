if(isElectron){
	var { IPC } = await import('#project/src/ENV/electron')
}

window.addEventListener('load',() => {
	IPC?.send('json',{
		type : 'fetch-ahk_cp-status',
		data : null,
	});
});


import { isElectron } from '#project/src/ENV';
