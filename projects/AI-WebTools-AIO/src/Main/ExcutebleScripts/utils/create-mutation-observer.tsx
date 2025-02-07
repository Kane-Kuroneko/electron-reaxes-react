export type Matter = {
	name:string;
	condition : (mutation:MutationRecord) => any,
	action : (resolve:() => void , mutation) => void
}
export const createMutationObserver = (matters:Matter[]) => {
	const observer = new MutationObserver( ( mutations , observer ) => {
		for( const mutation of mutations ){
			const promises = matters.map( ( { action , condition } ) => {
				const { promise , resolve , reject } = Promise.withResolvers<void>();
				if( !!condition(mutation) ) {
					try {
						action( resolve , mutation );
					} catch ( e ) {
						reject( e );
					}
				}
				return promise;
			} );
			
			Promise.all( promises ).
			then( () => {
				console.log( `所有script执行完成,已清除observer` );
				observer.disconnect();
			} ).
			catch( ( reason ) => {
				console.error(`script执行出错:`,reason);
			} );
		}
		
	} );
	return {
		observer,
	}
}
