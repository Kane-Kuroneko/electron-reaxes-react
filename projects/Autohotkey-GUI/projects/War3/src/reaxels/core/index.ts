const CONSTANTS_detectionDelay = 90;

export const reaxel_Core = reaxel(() => {
	const {
		store,
		setState,
		mutate,
	} = orzMobx({
		switch_main : true,
		
		switch_forbidWheelsZoom : true,
		switch_replaceF6 : true,
		switch_RbtnDragging : true,
		
		input_detectionDelay : 90,
	});
	
	
	
	const ret = {
		toggleMainSwitch(value = store.switch_main){
			mutate( s => s.switch_main = !value );
			
		},
		toggleWheelsZoom(value = store.switch_forbidWheelsZoom){
			mutate( s => s.switch_forbidWheelsZoom = !value  );
		},
		toggleReplaceF6(value = store.switch_replaceF6){
			mutate( s => s.switch_replaceF6 = !value );
		},
		toggleRbtnDragging(value = store.switch_RbtnDragging){
			mutate( s => s.switch_RbtnDragging = !value );
		},
		setDetectionDelay( ms ) {
			mutate( s => s.input_detectionDelay = ms );
		},
		resetDetectionDelay(){
			mutate( s => s.input_detectionDelay = CONSTANTS_detectionDelay );
		}
	};
	
	return () => {
		
		
		return ret;
	};
})
