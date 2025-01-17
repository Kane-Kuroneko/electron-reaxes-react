const CONSTANTS_detectionDelay = 85;

export const reaxel_HotkeyEnhancer = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate ,
	} = orzMobx( {
		switch_main : false ,
		checkbox_AutoSwitch : true ,
		
		switch_forbidWheelsZoom : true ,
		switch_replaceF6 : true ,
		switch_RbtnDragging : true ,
		switch_MbtnToAttack : true ,
		switch_SpaceF6SaveToSpecial : true ,
		
		
		ModalVisible_F6ShowCase : false ,
		ModalVisible_editSpecialSavesList : false ,
		
		specialSavesList : [] as string[] ,
		
		input_detectionDelay : CONSTANTS_detectionDelay ,
		input_detectionDelay_editing : false ,
	} );
	
	const persist = Refaxel_BrowserPersist( 'GUI' )( {
		store , setState , filter( s ) {
			return _.omit( s , 'switch_main' );
		} ,
	} );
	
	IpcRendererOn( 'ahk-cp-status' ).on( ( e , data ) => {
		console.log( e , data );
		setState( { switch_main : data } );
	} );
	
	IpcRendererSend( 'ahk' ).send( [
		{
			key : 'switch_main' ,
			value : store.switch_main ,
		} ,
		{
			key : 'switch_forbidWheelsZoom' ,
			value : store.switch_forbidWheelsZoom ,
		} ,
		{
			key : 'switch_replaceF6' ,
			value : store.switch_replaceF6 ,
		} ,
		{
			key : 'switch_RbtnDragging' ,
			value : store.switch_RbtnDragging ,
		} ,
		{
			key : 'input_detectionDelay' ,
			value : store.input_detectionDelay ,
		} ,
	] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IpcRendererSend( 'ahk' ).send( [
			{
				key : 'switch_main' ,
				value : store.switch_main ,
			} ,
		] );
	} , () => [ store.switch_main ] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IpcRendererSend( 'ahk' ).send( [
			{
				key : 'switch_forbidWheelsZoom' ,
				value : store.switch_forbidWheelsZoom ,
			} ,
		] );
	} , () => [ store.switch_forbidWheelsZoom ] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IpcRendererSend( 'ahk' ).send( [
			{
				key : 'switch_replaceF6' ,
				value : store.switch_replaceF6 ,
			} ,
		] );
	} , () => [ store.switch_replaceF6 ] );
	
	obsReaction( ( first ) => {
		console.log( 'store.switch_RbtnDragging:' , store.switch_RbtnDragging );
		if( first ) return;
		IpcRendererSend( 'ahk' ).send( [
			{
				key : 'switch_RbtnDragging' ,
				value : store.switch_RbtnDragging ,
			} ,
		] );
	} , () => [ store.switch_RbtnDragging ] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IpcRendererSend( 'ahk' ).send( [
			{
				key : 'input_detectionDelay' ,
				value : store.input_detectionDelay ,
			} ,
		] );
	} , () => [ store.input_detectionDelay ] );
	
	obsReaction( ( first ) => {
		if( first ) return;
		IpcRendererSend( 'ahk' ).send( [
			{
				key : 'switch_MbtnToAttack' ,
				value : store.switch_MbtnToAttack ,
			} ,
		] );
	} , () => [ store.switch_MbtnToAttack ] );
	
	obsReaction( ( first ) => {
		IpcRendererSend( 'monitor-war3exe-process' ).send( store.checkbox_AutoSwitch ? 'start' : 'stop' );
	} , () => [ store.checkbox_AutoSwitch ] );
	
	
	const ret = {
		GUI_Store : store ,
		GUI_SetState : setState ,
		GUI_Mutate : mutate ,
		spawnAHK() {
			if( store.checkbox_AutoSwitch ) {
				return;
			}
			if( !store.switch_main ) {
				IpcRendererSend( 'spawn' ).send( 'war3-ahk' );
			}
		} ,
		shutdownAHK() {
			IpcRendererSend( 'exit-ahk' ).send( null );
		} ,
		toggleMainSwitch( value = !store.switch_main ) {
			//开启自动检测时此函数不应该继续往下执行.
			if( store.checkbox_AutoSwitch ) {
				return;
			}
			if( isBrowser ) {
				setState( { switch_main : !store.switch_main } );
				return;
			}
			if( value && !store.switch_main ) {
				ret.spawnAHK();
			} else {
				ret.shutdownAHK();
			}
			// GUI_Mutate( s => s.switch_main = value );
		} ,
		toggleWheelsZoom( value = !store.switch_forbidWheelsZoom ) {
			mutate( s => s.switch_forbidWheelsZoom = value );
		} ,
		toggleReplaceF6( value = !store.switch_replaceF6 ) {
			mutate( s => s.switch_replaceF6 = value );
		} ,
		toggleRbtnDragging( value = !store.switch_RbtnDragging ) {
			mutate( s => s.switch_RbtnDragging = value );
		} ,
		toggleMbuttonToAttack( value = !store.switch_MbtnToAttack ) {
			mutate( s => s.switch_MbtnToAttack = value );
		} ,
		toggleAutoSwitch( value = !store.checkbox_AutoSwitch ) {
			setState( {
				checkbox_AutoSwitch : value ,
			} );
		} ,
		toggleEditSpecialSavesListModalVisible( visible = !store.ModalVisible_editSpecialSavesList ) {
			mutate( s => s.ModalVisible_editSpecialSavesList = !s.ModalVisible_editSpecialSavesList );
		} ,
		setDetectionDelay( ms ) {
			mutate( s => s.input_detectionDelay = ms );
		} ,
		resetDetectionDelay() {
			mutate( s => s.input_detectionDelay = CONSTANTS_detectionDelay );
		} ,
	};
	
	if( !store.checkbox_AutoSwitch && store.switch_main ) {
		ret.spawnAHK();
	}
	
	return () => {
		
		
		return ret;
	};
} );

import { IpcRendererSend , IpcRendererOn , IpcRendererInvoke } from '#renderer/utils/useIPC';
import { Refaxel_BrowserPersist } from '#generic/reaxels/browser-persist';
import { isElectron , isBrowser } from '#renderer/ENV';




