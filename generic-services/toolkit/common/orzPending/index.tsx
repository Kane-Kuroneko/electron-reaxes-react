/**
 * pending状态和error状态
 */
export const orzPending = () => {
	const [, [pendingState, setPending,setError]] = utils.makePair(orzMobx({ 
		pending: false ,
		error : false ,
	}), ({ store, setState }) => {
		return [
			store ,
			(pending : boolean) => queueMicrotask(() => setState({ pending })) ,
			(error : boolean) => queueMicrotask(() => setState({ error })),
		] as const;
	});
	return { pendingState, setPending, setError };
};

/**
 * @example
 */
if(false){
	const TestRender = reaxper(() => {
		
		const { pending , error , setPending , setError } = reaxel();
		
		if( pending ) {
			return <span>pending.......</span>;
		}
		
		if( error ) {
			return <span>Error!</span>;
		}
		
		return <div
			onClick = { () => {
				setPending(true);
			} }
		>
			message
		</div>;
	});
	
	
	const reaxel = function(){
		const { pendingState , setPending , setError } = orzPending();
		
		
		crayon.blue(pendingState.pending);
		setPending(true);
		
		orzPromise((res , rej) => {
			setTimeout(() => {
				rej();
			} , 1400);
		}).then(() => {
			setPending(false);
		}).catch(() => {
			setPending(false);
			setError(true);
		});
		return () => {
			return {
				get pending(){
					return pendingState.pending;
				} ,
				get error(){
					return pendingState.error;
				} ,
				setPending ,
				setError ,
			};
		};
	}();
}
