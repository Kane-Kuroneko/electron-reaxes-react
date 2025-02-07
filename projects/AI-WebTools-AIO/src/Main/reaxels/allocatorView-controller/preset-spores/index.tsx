import { Refaxel_Spore } from '#main/refaxels/Spore';


export const presetSpores = [];

const chatGPT = Refaxel_Spore( {
	conf : {
		name : 'chatGPT' ,
		url : 'https://chatgpt.com' ,
		proxy : '127.0.0.1:7897' ,
	} ,
	executeScripts : (controller) => [
		``,
	] ,
} );
