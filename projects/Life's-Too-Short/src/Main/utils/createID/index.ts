export const createID = new class {
	
	get uuid(){
		return uuidv4();
	}
	
	messageid(){
		return `messageid_${this.uuid}`;
	}
	chatid(){
		return `chatid_${this.uuid}`;
	}
	channelid(){
		return `channelid_${this.uuid}`;
	}
}

import { v4 as uuidv4 } from 'uuid';
