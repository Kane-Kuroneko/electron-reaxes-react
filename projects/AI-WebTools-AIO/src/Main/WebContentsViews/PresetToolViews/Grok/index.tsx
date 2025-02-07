export const grokView = createWebContentsView( {
	proxyRules : 'http=127.0.0.1:7897;https=127.0.0.1:7897' ,
	url : `https://x.com/i/grok?focus=1` ,
} );
grokView.then(({wcv,controller}) => {
	wcv.webContents.on('did-finish-load',() => {
		wcv.webContents.executeJavaScript( removeCloseBtn ).then( r => {
			console.log( r );
		} ).catch( e => {
			console.error( e );
		} );
		
		wcv.webContents.executeJavaScript( injectWcvctrlTemplate(controller) ).then( r => {
			console.log( r );
		} ).catch( e => {
			console.error( e );
		} );
	})
	
});
const Grok = Refaxel_Spore( {
	conf : {
		name : 'grok' ,
		url : `https://x.com/i/grok?focus=1` ,
		proxy : '127.0.0.1:7897' ,
	} ,
	executeScripts : ( controller ) => [
		removeCloseBtn ,
		injectWcvctrlTemplate( controller ),
	] ,
} );
import { Refaxel_Spore } from '#main/refaxels/Spore';
import { injectWcvctrlTemplate } from '../../../ExcutebleScripts/templates/inject-wcvctrl';
/*@ts-expect-error*/
import removeCloseBtn from './execScripts/remove-close-btn.raw';
import { createWebContentsView } from '#project/src/Main/reaxels/wcv-hub/create-wcv';
