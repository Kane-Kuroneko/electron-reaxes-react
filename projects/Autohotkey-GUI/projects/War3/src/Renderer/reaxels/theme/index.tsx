export const reaxel_Theme = reaxel( () => {
	
	const reaxel_Lottie = Refaxel_Lottie( {
		schemes : [
			{ name : "dark" as const , segments : [ 19 , 80 ] } ,
			{ name : "light" as const , segments : [ 100 , 173 ] } ,
		] as const ,
		defaultScheme : 'dark' ,
		animationData : lottieJSON ,
		speed : 7 ,
		lottieProps : {} ,
	} as Options<Theme> );
	
	obsReaction( () => {
		document.documentElement.setAttribute( 'theme' , reaxel_Lottie().lottie_Store.currentScheme );
	} , () => [reaxel_Lottie().lottie_Store.currentScheme] );
	
	let rtn = {
		get theme() {
			return reaxel_Lottie().lottie_Store.currentScheme;
		} ,
		reaxel_Lottie ,
		toggleTheme( theme: Theme = reaxel_Lottie().lottie_Store.currentScheme ) {
			reaxel_Lottie().toggleTo( theme );
		} ,
	};
	return () => {
		return rtn;
	};
} );

export type Theme = "dark" | "light";

import { Options , Refaxel_Lottie } from '#generic/reaxels/Factories/lottie.json';
import * as lottieJSON from "./lottie.json";
