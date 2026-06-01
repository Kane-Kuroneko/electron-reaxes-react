export const LongPressButton = (props:any) => {
	const {
		onConfirm ,
		...buttonProps
	} = props;
	const [ holding , setHolding ] = useState( false );
	const [ progress , setProgress ] = useState( 0 );
	const timerRef = useRef<ReturnType<typeof setInterval>>( null );
	const startedAt = useRef( 0 );
	const holdMs = 900;
	
	const stop = () => {
		if( timerRef.current ) {
			clearInterval( timerRef.current );
			timerRef.current = null;
		}
		setHolding( false );
		setProgress( 0 );
	};
	
	const start = () => {
		if( buttonProps.loading || timerRef.current ) return;
		startedAt.current = Date.now();
		setHolding( true );
		timerRef.current = setInterval( () => {
			const nextProgress = Math.min( 1 , ( Date.now() - startedAt.current ) / holdMs );
			setProgress( nextProgress );
			if( nextProgress >= 1 ) {
				stop();
				onConfirm?.();
			}
		} , 16 );
	};
	
	return <Button
		{ ...buttonProps }
		onMouseDown={ start }
		onMouseUp={ stop }
		onMouseLeave={ stop }
		onTouchStart={ start }
		onTouchEnd={ stop }
		className={ `${ buttonProps.className || '' } long-press-button ${ holding ? 'is-holding' : '' }` }
		style={ {
			...buttonProps.style ,
			'--hold-progress' : progress,
		} as any }
	/>;
};

import { Button } from 'antd';
