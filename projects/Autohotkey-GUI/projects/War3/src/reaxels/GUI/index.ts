const CONSTANTS_detectionDelay = 90;

export const reaxel_GUI = reaxel(() => {
	
	const {
		store:GUI_Store,
		setState:GUI_SetState,
		mutate:GUI_Mutate,
	} = orzMobx({
		switch_main : false,
		
		switch_forbidWheelsZoom : true,
		switch_replaceF6 : true,
		switch_RbtnDragging : true,
		
		input_detectionDelay : 90,
		input_detectionDelay_editing : false,
	});
	
	IPC.on( 'json' , ( e , json ) => {
		console.log(e,json);
		if( json.type === 'child_process-spawned' ) {
			GUI_SetState( { switch_main : true } );
		}
	} );
	
	IPC.send( 'json' , {
		type : 'ahk' ,
		data : [
			{
				key : 'switch_main' ,
				value : GUI_Store.switch_main,
			} ,
			{
				key : 'switch_forbidWheelsZoom' ,
				value : GUI_Store.switch_forbidWheelsZoom,
			} ,
			{
				key : 'switch_replaceF6' ,
				value : GUI_Store.switch_replaceF6,
			} ,
			{
				key : 'switch_RbtnDragging' ,
				value : GUI_Store.switch_RbtnDragging,
			} ,
			{
				key : 'input_detectionDelay' ,
				value : GUI_Store.input_detectionDelay,
			} ,
		],
	} );
	
	IPC.on( 'json' , ( e , json ) => {
		if( json.type === 'child_process-closed' ) {
			GUI_Mutate( s => s.switch_main = false );
		}
	} );
	
	obsReaction((first) => {
		if (first) return;
		IPC.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'switch_main' ,
					value : GUI_Store.switch_main,
				} ,
			]
		} );
	},() => [GUI_Store.switch_main]);
	
	obsReaction((first) => {
		if (first) return;
		IPC.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'switch_forbidWheelsZoom' ,
					value : GUI_Store.switch_forbidWheelsZoom,
				} ,
			]
		} );
	},() => [GUI_Store.switch_forbidWheelsZoom]);
	
	obsReaction((first) => {
		if (first) return;
		IPC.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'switch_replaceF6' ,
					value : GUI_Store.switch_replaceF6,
				} ,
			]
		} );
	},() => [GUI_Store.switch_replaceF6]);
	
	obsReaction((first) => {
		if (first) return;
		IPC.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'switch_RbtnDragging' ,
					value : GUI_Store.switch_RbtnDragging,
				} ,
			]
		} );
	},() => [GUI_Store.switch_RbtnDragging]);
	
	obsReaction((first) => {
		if (first) return;
		IPC.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'input_detectionDelay' ,
					value : GUI_Store.input_detectionDelay,
				} ,
			]
		} );
	},() => [GUI_Store.input_detectionDelay]);
	
	const ret = {
		GUI_Store,
		GUI_Mutate,
		spawnAHK(){
			if(!GUI_Store.switch_main){
				IPC.send( "json" , {
					type : 'spawn' ,
					app : 'war3-ahk' ,
				} );
			}
		},
		toggleMainSwitch(value = !GUI_Store.switch_main){
			if(value && !GUI_Store.switch_main){
				ret.spawnAHK();
			}else {
				IPC.send( 'json' , {
					type : 'exit-ahk' ,
				} );
			}
			// GUI_Mutate( s => s.switch_main = value );
		},
		toggleWheelsZoom(value = !GUI_Store.switch_forbidWheelsZoom){
			GUI_Mutate( s => s.switch_forbidWheelsZoom = value  );
		},
		toggleReplaceF6(value = !GUI_Store.switch_replaceF6){
			GUI_Mutate( s => s.switch_replaceF6 = value );
		},
		toggleRbtnDragging(value = !GUI_Store.switch_RbtnDragging){
			GUI_Mutate( s => s.switch_RbtnDragging = value );
		},
		setDetectionDelay( ms ) {
			GUI_Mutate( s => s.input_detectionDelay = ms );
		},
		resetDetectionDelay(){
			GUI_Mutate( s => s.input_detectionDelay = CONSTANTS_detectionDelay );
		}
	};
	ret.spawnAHK();
	return () => {
		
		
		return ret;
	};
})





