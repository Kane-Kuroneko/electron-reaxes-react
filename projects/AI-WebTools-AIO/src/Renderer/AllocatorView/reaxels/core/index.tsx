export const reaxel_Core = reaxel(() => {
	const { store , setState , mutate } = orzMobx( {
		spores : [] as Spore[],
		
	} );
	
	window.addEventListener('load',async () => {
		const spores = await getFavicon('https://chatgpt.com');
		setState( { spores } );
	})
	
	let rtn = {
		Core_Store:store,
		Core_SetState:setState,
		Core_Mutate : mutate,
		getFavicon,
	};
	return () => {
		
		return rtn;
	}
})

export type Spore = {
	url : string;
	spore_id? : number|string;
	mounted : boolean;
	/*如果不传则默认用host/favicon */
	iconUrl? : string;
}

const Ipc_getSpores = async () => {
	IPC.invoke('get-spores').then((value) => {
		
	})
	
}

const getFavicon = async (url:string) => {
	return [
		{
			url : 'https://chatgpt.com' ,
			mounted : false ,
			spore_id : 'chatGPT.openAI' ,
			
		},
		{
			url : `https://x.com/i/grok?focus=1` ,
			mounted : false ,
			spore_id : 'grok.X' ,
			
		},
	] as Spore[];
	const getByWebsiteDefault = async () => {
		const iconUrl = `${ url }/favicon.ico`;
		fetch(iconUrl).then(r => {
			debugger;
		}).catch(e => {
			debugger;
		})
	}
	
	const fallbackGoogleApi = async () => {
		const googleUrl = `https://www.google.com/s2/favicons?domain=${ url }`;
		fetch( googleUrl ).then( r => {debugger} ).catch( e => {
			debugger;
		} );
	}
	getByWebsiteDefault();
}
