export interface IpcRendererSend {
	'1' : Tuple<[null] , void>;
	'2' : Tuple<[{ }], void>
}

export interface IpcRendererInvoke {
	'get-settings' : Tuple<[void] , {
		global_proxy: {
			enabled: boolean;
			address: string;
			type: 'https'|'http'|'socks5';
			port: number;
			hostname: string;
			no_proxy_for: string[];
			proxy_auth: {
				enabled: boolean;
				username: string;
				password: string;
			};
		}
	}>;
	'submit-settings' : Tuple<[{
		proxy: {
			enabled: boolean;
			address: string;
			type: string;
			port: number;
			hostname: string;
			no_proxy_for: string[];
			proxy_auth: {
				enabled: boolean;
				username: string;
				password: string;
			};
		}
	}], void>;
}

export interface IpcMainSend {
	
}


//payloads是元组类型,对应ipcRenderer.send(channel,...payloads);
type Tuple<P extends any[],R> = {
	payloads : P,
	response : R,
};
