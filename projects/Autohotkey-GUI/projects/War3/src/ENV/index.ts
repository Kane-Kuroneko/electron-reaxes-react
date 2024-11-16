export const env = function () {
	
	if(window.IPC && window.versions?.electron){
		return 'electron';
	}else {
		return 'browser';
	}
}();

export const isElectron = env === "electron";
export const isBrowser = env === "browser";
