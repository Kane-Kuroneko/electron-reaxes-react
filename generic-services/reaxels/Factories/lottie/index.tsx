/**
 * 创建一个便于使用lottie的reaxel ,
 */
export const Refaxel_Lottie = <SchemeNames extends string>( initOptions: Options<SchemeNames> ) => {
	return reaxel( () => {
		const { setState , store } = orzMobx( {
			currentScheme : null as SchemeNames ,
			playing : false ,
			lottie : null ,
			toggling : null as SchemeNames,
			sleeping : false,
		} );
		let lottiePromise = orzPromise<LottieRef['current']>();
		
		obsReaction( () => {
			if( store.lottie ) {
				lottiePromise.resolve( store.lottie );
			}
		} , () => [ store.lottie ] );
		
		let togglePromise : OrzPromise<null> & {playing? : SchemeNames};
		
		let sleepTimeoutID = null;
		let sleepingPromise : OrzPromise;
		
		return () => {
			/**
			 * @typedef Rtn
			 * @property ret.sleep 让动画保持当前状态休眠,期间调用toggleTo无效, 直至休眠时间结束
			 */
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
				initialTogge(name : SchemeNames){
					lottiePromise.then( ( lottie ) => {
						const scheme = initOptions.schemes.find( s => s.name === name );
						let segment = scheme.segments[(scheme.direction === -1) ? 0 : 1];
						lottie.goToAndStop( segment , true );
					} );
				},
				mount( lottie: LottieRef['current'] ) {
					setState( { lottie } );
					ret.initialTogge( store.currentScheme ?? initOptions.defaultScheme );
				} ,
				toggleTo( name: SchemeNames ) {
					if(store.playing) return togglePromise;
					if(store.sleeping) return sleepingPromise;
					setState( { playing : true,toggling : name  } );
					togglePromise = orzPromise();
					togglePromise.playing = name;
					lottiePromise.then( ( lottie ) => {
						const scheme = initOptions.schemes.find( s => s.name === name );
						if(scheme.speed){
							lottie.setSpeed(scheme.speed)
						}else if(initOptions.speed){
							lottie.setSpeed(initOptions.speed)
						}else {
							lottie.setSpeed( 1 );
						}
						if(scheme.direction){
							lottie.setDirection(scheme.direction);
						}else {
							lottie.setDirection(1);
						}
						lottie.playSegments( scheme.segments , true );
						console.log( '将要变化为:' , name , initOptions.schemes.find( s => s.name === name ).segments);
					} );
					return togglePromise as OrzPromise<SchemeNames>;
				} ,
				onComplete() {
					// console.log('completed' , {
					// 	prevScheme : store.currentScheme,
					// });
					const toggling = store.toggling;
					setState( {
						currentScheme : toggling,
						playing : false ,
						toggling : null
					} );
					if(toggling === togglePromise.playing){
						togglePromise.resolve(null);
					}
				} ,
				sleep(timeout:number){
					if(store.sleeping) throw new Error('当前lottie正在sleep,请在sleep的promise后再调用sleep');
					setState({sleeping : true});
					crayon.orange('睡眠中...')
					sleepingPromise = orzPromise();
					sleepTimeoutID = setTimeout( () => {
						sleepingPromise.resolve( null );
						crayon.green( '睡醒了' );
						setState( { sleeping : false } );
					} , timeout );
					return sleepingPromise;
				},
				unmount() {
					setState( { toggling : null , playing : false } );
					lottiePromise.then( ( lottie ) => {
						// lottie.destroy();
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
		segments: [ number , number ],
		//静止状态的片段帧
		// staticSegment : number,
		direction? : AnimationDirection,
		speed? : number,
	}>,
	defaultScheme: SchemeNames,
	speed? : number,
	lottieProps?: Omit<LottieOptions , 'animationData'>,
};

import type { LottieRef , LottieOptions } from 'lottie-react';
import { AnimationDirection } from 'lottie-web';
import { OrzPromise } from '#generic/utils/src/orzPromise.utility';
