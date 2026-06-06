export const cloneObservableToPlain = <T>(data:T):T => {
	return clonePlainValue( data , new WeakMap() );
};

export const cloneForIPC = cloneObservableToPlain;

const clonePlainValue = (value:any , seen:WeakMap<object , any>):any => {
	const source = isObservable( value ) ? toJS( value ) : value;
	
	if( source === null ) {
		return source;
	}
	
	const valueType = typeof source;
	if( valueType === 'function' || valueType === 'symbol' ) {
		return undefined;
	}
	if( valueType !== 'object' ) {
		return source;
	}
	
	if( source instanceof Date ) {
		return new Date( source.getTime() );
	}
	if( seen.has( source ) ) {
		return seen.get( source );
	}
	if( Array.isArray( source ) ) {
		const result:any[] = [];
		seen.set( source , result );
		source.forEach( ( item , index ) => {
			result[index] = clonePlainValue( item , seen );
		} );
		return result;
	}
	if( source instanceof Map ) {
		const result = new Map();
		seen.set( source , result );
		source.forEach( ( item , key ) => {
			result.set( key , clonePlainValue( item , seen ) );
		} );
		return result;
	}
	if( source instanceof Set ) {
		const result = new Set();
		seen.set( source , result );
		source.forEach( item => {
			result.add( clonePlainValue( item , seen ) );
		} );
		return result;
	}
	
	const result:Record<string , unknown> = {};
	seen.set( source , result );
	Object.keys( source ).forEach( key => {
		const clonedValue = clonePlainValue( source[key] , seen );
		if( clonedValue !== undefined ) {
			result[key] = clonedValue;
		}
	} );
	return result;
};

import {
	isObservable ,
	toJS,
} from 'mobx';
