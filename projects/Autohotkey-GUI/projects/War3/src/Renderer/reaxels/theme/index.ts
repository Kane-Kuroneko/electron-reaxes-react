export const reaxel_Theme = reaxel( () => {
	const { store , setState , mutate } = createReaxable({});
	const reaxel_Lottie = Refaxel_Lottie( {
		schemes : [
			{ name : "dark" as const , segments : [ 19 , 80 ]  } ,
			{ name : "light" as const , segments : [ 100 , 173 ] } ,
		] as const ,
		defaultScheme : 'dark' ,
		animationData : lottieJSON ,
		speed : 7 ,
		lottieProps : {} ,
	} as Options<Theme> );
		
	rehance_BrowserPersist( '|theme|' )( {
		setState : setState ,
		store : store ,
		filter( s ) {
			return _.pick(s,['currentScheme'])
		},
	} );
	
	obsReaction( () => {
		document.documentElement.setAttribute( 'theme' , reaxel_Lottie.store.currentScheme );
	} , () => [reaxel_Lottie.store.currentScheme] );
	
	let rtn = {
		get theme() {
			return reaxel_Lottie.store.currentScheme;
		} ,
		toggleTheme( theme: Theme = reaxel_Lottie.store.currentScheme ) {
			reaxel_Lottie().toggleTo( theme );
		} ,
	};
	return Object.assign(() => {
		return rtn;
	} , {
		store ,
		setState ,
		mutate ,
		reaxel_Lottie,
	});
} );

export type Theme = "dark" | "light";

import { rehance_BrowserPersist } from '#generic/rehancers/browser-persist';
import { Options , Refaxel_Lottie } from '#generic/refaxels/lottie';
import * as lottieJSON from "./lottie.json";
