export const RuntimeTester = reaxper( () => {
	const ref: LottieRef = useRef();
	
	const [ scheme , setScheme ] = useState<'simple' | 'complex' | 'revert' | 'liquid' | 'heart'>( 'revert' );
	const { mount , onComplete , toggleTo , unmount , lottie_Store , lottie_SetState , animationData , lottieProps } = {
		'complex' : reaxel_Lottie_Complex ,
		'simple' : reaxel_Lottie_Simple ,
		'revert' : reaxel_Lottie_Revert ,
		'liquid' : reaxel_Lottie_Liquid ,
		'heart' : reaxel_Lottie_Heart ,
	}[scheme]();
	
	useEffect( () => {
		mount( ref.current );
		// return unmount;
		console.log( logProxy( _.omit( lottie_Store , 'lottie' ) ) );
		return () => {
			unmount();
		};
	} , [ scheme ] );
	
	return <div>
		<Lottie
			loop = { false }
			autoplay = { false }
			animationData = { animationData }
			style = { { cursor : "pointer" , height : 60 } }
			lottieRef = { ref }
			onClick = { () => {
				if( scheme === 'liquid' ) {
					const asserted = toggleTo as ReturnType<typeof reaxel_Lottie_Liquid>['toggleTo'];
					asserted( lottie_Store.currentScheme === 'enable' ? 'disable' : 'enable' ).
					then( () => {
						return asserted( lottie_Store.currentScheme === 'enable' ? 'disable' : 'enable' );
					} );
					return;
				} else if( scheme === 'heart' ) {
					const asserted = toggleTo as ReturnType<typeof reaxel_Lottie_Heart>['toggleTo'];
					asserted( 'play' ).
					then( () => {
						return asserted( 'revert' );
					} ).then( () => {
						// return asserted( 'reset' );
					} );
					return;
				} else if( scheme === 'complex' ) {
					const asserted = toggleTo as ReturnType<typeof reaxel_Lottie_Complex>['toggleTo'];
					asserted( lottie_Store.currentScheme === 'light' ? 'dark' : 'light' ).then( () => {
						if( lottie_Store.currentScheme === 'dark' ) {
							setScheme( 'simple' );
							reaxel_Lottie_Simple().toggleTo( 'light' ).then( () => {
								reaxel_Lottie_Simple().toggleTo( 'dark' );
							} );
						}
					} );
				}
				(
					toggleTo as ReturnType<typeof reaxel_Lottie_Simple | typeof reaxel_Lottie_Complex | typeof reaxel_Lottie_Revert>['toggleTo']
				)( lottie_Store.currentScheme === 'light' ? 'dark' : 'light' );
			} }
			onComplete = { () => {
				onComplete();
			} }
		/>
		<h2>当前主题:{ scheme } , 显示模式:{ lottie_Store.currentScheme }</h2>
		<Radio.Group
			onChange = { ( e ) => {
				setScheme( e.target.value );
			} }
			value = { scheme }
			disabled = { lottie_Store.playing }
		>
			<Radio
				value = "complex"
			>complex</Radio>
			<Radio
				value = "simple"
			>simple</Radio>
			<Radio
				value = "revert"
			>revert</Radio>
			<Radio
				value = "liquid"
			>liquid</Radio>
			<Radio
				value = "heart"
			>heart</Radio>
		</Radio.Group>
	</div>;
} );


const reaxel_Lottie_Complex = Refaxel_Lottie<"dark" | "light">( {
	schemes : [
		{ name : "dark" as const , segments : [ 30 , 210 ] } ,
		{ name : "light" as const , segments : [ 280 , 430 ] } ,
	] as const ,
	defaultScheme : 'light' ,
	animationData : complex ,
	speed : 7 ,
	
} );
const reaxel_Lottie_Simple = Refaxel_Lottie<"dark" | "light">( {
	schemes : [
		{ name : "dark" as const , segments : [ 19 , 80 ] } ,
		{ name : "light" as const , segments : [ 100 , 173 ] } ,
	] as const ,
	defaultScheme : 'dark' ,
	animationData : simple ,
	speed : 7 ,
	lottieProps : {} ,
} );

const reaxel_Lottie_Revert = Refaxel_Lottie<"light" | "dark">( {
	schemes : [
		{ name : "dark" as const , segments : [ 40 , 100 ] } ,
		{ name : "light" as const , segments : [ 100 , 40 ] , direction : -1  } ,
	] as const ,
	defaultScheme : 'dark' ,
	animationData : revert ,
	speed : 2 ,
	lottieProps : {} ,
} );

const reaxel_Lottie_Liquid = Refaxel_Lottie<"disable" | "enable">( {
	schemes : [
		{ name : "disable" as const , segments : [ 0 , 14 ] } ,
		{ name : "enable" as const , segments : [ 30 , 43 ] , direction : 1  } ,
	] as const ,
	defaultScheme : 'disable' ,
	animationData : liquid ,
	speed : 2 ,
	lottieProps : {} ,
} );

const reaxel_Lottie_Heart = Refaxel_Lottie<"play" | "reset" | "revert">( {
	schemes : [
		{ name : "play" as const , segments : [ 0 , 190 ] } ,
		{ name : "revert" as const , segments : [ 190 , 0 ] , speed : .5 } ,
		{ name : "reset" as const , segments : [ 0 , 1 ] } ,
	] as const ,
	defaultScheme : 'reset' ,
	animationData : heart ,
	speed : 1 ,
	lottieProps : {} ,
} );

// import { Refaxel_BrowserPersist } from '#generic/reaxels/browser-persist';
import { Radio } from 'antd';
import { Options , Refaxel_Lottie } from '#generic/reaxels/Factories/lottie';
import Lottie , { LottieRef , LottieOptions } from "lottie-react";
import * as complex from "./dark mode.json";
import * as simple from "./simple animate.json";
import * as revert from "./revert.json";
import * as liquid from "./liquid.json";
import * as heart from "./heart.json";
