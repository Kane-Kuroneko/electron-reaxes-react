if(isElectron){
	var { IPC } = await import('../../ENV/electron')
}

const CONSTANTS_detectionDelay = 90;

export const reaxel_GUI = reaxel( () => {
	
	const {
		store : GUI_Store ,
		setState : GUI_SetState ,
		mutate : GUI_Mutate ,
	} = orzMobx( {
		switch_main : false ,
		
		switch_forbidWheelsZoom : true ,
		switch_replaceF6 : true ,
		switch_RbtnDragging : true ,
		switch_MbtnToAttack : true ,
		
		checkbox_AutoSwitch : true,
		
		input_detectionDelay : 90 ,
		input_detectionDelay_editing : false ,
	} );
	IPC?.on( 'json' , ( e , json ) => {
		console.log( e , json );
		if( json.type === 'ahk-cp-status' ) {
			GUI_SetState( { switch_main : json.data } );
		}
	} );
	
	IPC?.send( 'json' , {
		type : 'ahk' ,
		data : [
			{
				key : 'switch_main' ,
				value : GUI_Store.switch_main ,
			} ,
			{
				key : 'switch_forbidWheelsZoom' ,
				value : GUI_Store.switch_forbidWheelsZoom ,
			} ,
			{
				key : 'switch_replaceF6' ,
				value : GUI_Store.switch_replaceF6 ,
			} ,
			{
				key : 'switch_RbtnDragging' ,
				value : GUI_Store.switch_RbtnDragging ,
			} ,
			{
				key : 'input_detectionDelay' ,
				value : GUI_Store.input_detectionDelay ,
			} ,
		] ,
	} );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IPC?.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'switch_main' ,
					value : GUI_Store.switch_main ,
				} ,
			],
		} );
	} , () => [ GUI_Store.switch_main ] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IPC?.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'switch_forbidWheelsZoom' ,
					value : GUI_Store.switch_forbidWheelsZoom ,
				} ,
			],
		} );
	} , () => [ GUI_Store.switch_forbidWheelsZoom ] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IPC?.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'switch_replaceF6' ,
					value : GUI_Store.switch_replaceF6 ,
				} ,
			],
		} );
	} , () => [ GUI_Store.switch_replaceF6 ] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IPC?.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'switch_RbtnDragging' ,
					value : GUI_Store.switch_RbtnDragging ,
				} ,
			],
		} );
	} , () => [ GUI_Store.switch_RbtnDragging ] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IPC?.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'input_detectionDelay' ,
					value : GUI_Store.input_detectionDelay ,
				} ,
			],
		} );
	} , () => [ GUI_Store.input_detectionDelay ] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IPC?.send( 'json' , {
			type : 'ahk' ,
			data : [
				{
					key : 'switch_MbtnToAttack' ,
					value : GUI_Store.switch_MbtnToAttack ,
				} ,
			] ,
		} );
	} , () => [ GUI_Store.switch_MbtnToAttack ] );
	
	obsReaction( (first) => {
		if (first) return;
		IPC?.send( 'json' , {
			type : 'monitor-war3exe-process' ,
			data : GUI_Store.checkbox_AutoSwitch ? 'start' : 'stop' ,
		} );
	} , () => [ GUI_Store.checkbox_AutoSwitch ] );
	
	IPC?.on('json',(e,data) => {
		if(data.type === 'war3-process-existence'){
			ret.toggleMainSwitch(data.data);
		}
	});
	
	const ret = {
		GUI_Store ,
		GUI_Mutate ,
		spawnAHK() {
			if( !GUI_Store.switch_main ) {
				IPC?.send( "json" , {
					type : 'spawn' ,
					data : 'war3-ahk' ,
				} );
			}
		} ,
		shutdownAHK(){
			IPC?.send( 'json' , {
				type : 'exit-ahk' ,
				data : null,
			} );
		},
		toggleMainSwitch( value = !GUI_Store.switch_main ) {
			//开启自动检测时此函数不应该继续往下执行.
			if(GUI_Store.checkbox_AutoSwitch){
				return;
			}
			if(isBrowser){
				GUI_SetState({switch_main : !GUI_Store.switch_main});
				return;
			}
			if( value && !GUI_Store.switch_main ) {
				ret.spawnAHK();
			} else {
				ret.shutdownAHK();
			}
			// GUI_Mutate( s => s.switch_main = value );
		} ,
		toggleWheelsZoom( value = !GUI_Store.switch_forbidWheelsZoom ) {
			GUI_Mutate( s => s.switch_forbidWheelsZoom = value );
		} ,
		toggleReplaceF6( value = !GUI_Store.switch_replaceF6 ) {
			GUI_Mutate( s => s.switch_replaceF6 = value );
		} ,
		toggleRbtnDragging( value = !GUI_Store.switch_RbtnDragging ) {
			GUI_Mutate( s => s.switch_RbtnDragging = value );
		} ,
		toggleMbuttonToAttack( value = !GUI_Store.switch_MbtnToAttack ) {
			GUI_Mutate( s => s.switch_MbtnToAttack = value );
		} ,
		toggleAutoSwitch(value = !GUI_Store.checkbox_AutoSwitch){
			GUI_SetState( {
				checkbox_AutoSwitch : value ,
			} );
		},
		setDetectionDelay( ms ) {
			GUI_Mutate( s => s.input_detectionDelay = ms );
		} ,
		resetDetectionDelay() {
			GUI_Mutate( s => s.input_detectionDelay = CONSTANTS_detectionDelay );
		},
	};
	ret.spawnAHK();
	return () => {
		
		
		return ret;
	};
} );

import { isElectron , isBrowser } from '../../ENV';





