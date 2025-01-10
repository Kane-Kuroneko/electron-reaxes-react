/**
 * 创建一个便于使用lottie的reaxel ,
 */
export const Refaxel_Lottie = <SchemeNames extends string>( initOptions: Options<SchemeNames> ) => {
	return reaxel( () => {
		const { setState , store } = orzMobx( {
			currentScheme : null ,
			playing : false ,
			lottie : null ,
			toggling : null as SchemeNames,
		} );
		let lottiePromise = orzPromise<LottieRef['current']>();
		
		obsReaction( () => {
			if( store.lottie ) {
				lottiePromise.resolve( store.lottie );
			}
		} , () => [ store.lottie ] );
		
		return () => {
			let ret = {
				lottie_Store : store ,
				lottie_SetState : setState ,
				animationData : initOptions.animationData ,
				get lottieProps() {
					if( initOptions.lottieProps ) {
						return initOptions.lottieProps;
					} else {
						return {};
					}
				} ,
				mount( lottie: LottieRef['current'] ) {
					setState( { lottie } );
					console.log( store.currentScheme ,initOptions.schemes);
					const current = initOptions.schemes.find(s => s.name === store.currentScheme);
					// ret.toggleTo( store.currentScheme );
					if(initOptions.speed){
						lottie.setSpeed( initOptions.speed );
					}
					ret.toggleTo(store.currentScheme ?? initOptions.defaultScheme );
				} ,
				toggleTo( name: SchemeNames ) {
					if(store.playing) return;
					
					lottiePromise.then( ( lottie ) => {
						const scheme = initOptions.schemes.find( s => s.name === name );
						setState( { playing : true , toggling : name } );
						if(scheme.direction){
							lottie.setDirection(scheme.direction);
						}else {
							lottie.setDirection(1);
						}
						lottie.playSegments( scheme.segments , true );
						console.log( '将要变化为:' , name , initOptions.schemes.find( s => s.name === name ).segments);
					} );
				} ,
				onComplete() {
					console.log('completed' , {
						prevScheme : store.currentScheme,
					});
					const toggling = store.toggling;
					setState( {
						currentScheme : toggling,
						playing : false ,
						toggling : null
					} );
				} ,
				unmount() {
					setState( { lottie : null } );
					lottiePromise.then( ( lottie ) => {
						lottie.destroy();
					} );
					lottiePromise = orzPromise();
				} ,
			};
			return ret;
		};
	} );
};

export type Options<SchemeNames extends string> = {
	animationData: any,
	schemes: ReadonlyArray<{
		name: SchemeNames,
		direction? : AnimationDirection,
		segments: [ number , number ],
	}>,
	defaultScheme: SchemeNames,
	speed? : number,
	lottieProps?: Omit<LottieOptions , 'animationData'>,
};

import type { LottieRef , LottieOptions } from 'lottie-react';
import { AnimationDirection } from 'lottie-web';
