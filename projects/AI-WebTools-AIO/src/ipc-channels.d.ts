export type IpcJsonHandle = {
	'set-spore-layout' : {
		data : {
			position : Position;
		};
		response : {
			spore_view_id : number|string;
			
		}
	}
}
export type IpcJsonOn = {
	'war3-process-existence': {
		data: boolean;
	};
};


import { Position } from '#project/src/types/index';
