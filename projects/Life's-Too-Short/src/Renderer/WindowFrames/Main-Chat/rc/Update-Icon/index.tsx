const reaxel_lottie_Update = Refaxel_Lottie<"start">( {
	animationData : Confetti ,
	schemes : [
		{
			name : 'start' as const ,
			segments : [
				0 ,
				80 ,
			] ,
		} ,
	] ,
	defaultScheme : 'start' ,
	speed : 1 ,
} );

export const UpdateIcon = reaxper( ( props: UpdateIconProps ) => {
	const ref: LottieRef = useRef();
	const {
		mount ,
		onComplete ,
		toggleTo ,
		unmount ,
		animationData ,
		sleep ,
	} = reaxel_lottie_Update();
	
	useEffect( () => {
		mount( ref.current );
		toggleTo( 'start' );
		return () => {
			unmount();
		};
	} , [] );
	
	return <div
		className = { less.updateIcon }
		style={{
			...(props.style ?? {})
		}}
	>
		<div
			style = { {
				display : 'flex' ,
				flex : '1 1 auto' ,
				justifyContent : 'center' ,
				gridArea : '1 / 1' ,
				cursor : 'pointer' ,
				
			} }
			onClick = { ( e ) => {
				props.onClick?.( e );
			} }
		>
			<NewIcon />
		</div>
		<Lottie
			loop = { true }
			autoplay = { true }
			animationData = { animationData }
			style = { {
				display : 'flex' ,
				gridArea : '1 / 1' ,
				zoom : '.2' ,
				pointerEvents : 'none',
				
			} }
			lottieRef = { ref }
			onClick = { () => {
			} }
			onComplete = { () => {
				onComplete();
			} }
		/>
	</div>;
} );

export type UpdateIconProps = {
	onClick?: ( e: React.MouseEvent<HTMLDivElement , MouseEvent> ) => void;
	style? : React.CSSProperties,
}
import React from 'react';
import Confetti from './Confetti.json';
import less from './index.module.less';
import { Refaxel_Lottie } from '#generic/refaxels/lottie';
import { NewIcon } from './new.svg';
import Lottie , {
	LottieRef ,
	LottieOptions ,
} from "lottie-react";
