/**
 * 此reaxel控制webview的缩放倍率
 */

export const reaxel_UIScale = reaxel(() => {
	
	const { store , setState , mutate } = orzMobx( {
		ratio : 1,
		ratioLevels : [
			.5,
			.75,
			1,
			1.25,
			1.5,
			1.75,
			2,
			2.5,
			3,
			4,
		],
	} );
	
	
	const ret = {
		get zooming (){
			return store.ratio !== 1;
		},
		setRatio(ratio:number){
			setState( { ratio } );
		},
		resetRatio(){
			setState( { ratio : 1 } );
		}
	};
	return () => {
		
		return ret;
	}
})