export namespace IpcRenderer {
	export type Send = {
		'exit-settings' : void;
		'settings-update' : void;
		'get-settings' : void;
	};
	export type On = {
		'settings-update' : void;
		'get-settings' : {
			proxy : string;
		};
	};
	export type Invoke = {
		'exit-settings' : void;
	};
}


