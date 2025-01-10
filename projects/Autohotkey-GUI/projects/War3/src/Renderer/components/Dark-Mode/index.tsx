export const DarkModeSwitchLottie = reaxper( () => {
	const ref: LottieRef = useRef();
	
	const { mount , onComplete , toggleTo , unmount , lottie_Store , lottie_SetState , animationData , lottieProps } = reaxel_Theme().reaxel_Lottie();
	
	useEffect( () => {
		mount( ref.current );
		return () => {
			unmount();
		};
	} , [] );
	
	return <Lottie
		loop = { false }
		autoplay = { false }
		animationData = { animationData }
		style = { { 
			cursor : "pointer" ,
			height : 34 ,
			position : 'absolute',
			left : 10,
			top : 10
	} }
		lottieRef = { ref }
		onClick = { () => {
			toggleTo( lottie_Store.currentScheme === 'light' ? 'dark' : 'light' );
		} }
		onComplete = { () => {
			onComplete();
		} }
	/>;
} );


import { reaxel_Theme } from '#renderer/reaxels/theme';
import { Radio } from 'antd';
import Lottie , { LottieRef , LottieOptions } from "lottie-react";
import * as complex from "./dark mode.json";
