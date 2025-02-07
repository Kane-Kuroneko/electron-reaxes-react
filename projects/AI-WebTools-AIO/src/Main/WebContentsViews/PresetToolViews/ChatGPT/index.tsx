export const chatGPTView = createWebContentsView( {
	proxyRules : 'http=127.0.0.1:7897;https=127.0.0.1:7897' ,
	url : `https://chatgpt.com` ,
} );

import { createWebContentsView } from '#project/src/Main/reaxels/wcv-hub/create-wcv';
