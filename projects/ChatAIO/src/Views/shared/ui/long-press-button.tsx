export const LongPressButton = ( props:{
	onConfirm: () => void;
	children: React.ReactNode;
	disabled?: boolean;
	loading?: boolean;
	variant?: ButtonProps['variant'];
	className?: string;
} ) => {
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
		if( props.loading || props.disabled || timerRef.current ) return;
		startedAt.current = Date.now();
		setHolding( true );
		timerRef.current = setInterval( () => {
			const nextProgress = Math.min( 1 , ( Date.now() - startedAt.current ) / holdMs );
			setProgress( nextProgress );
			if( nextProgress >= 1 ) {
				stop();
				props.onConfirm?.();
			}
		} , 16 );
	};

	return <Button
		variant={ props.variant }
		disabled={ props.disabled }
		loading={ props.loading }
		onMouseDown={ start }
		onMouseUp={ stop }
		onMouseLeave={ stop }
		onTouchStart={ start }
		onTouchEnd={ stop }
		className={ cn( 'relative overflow-hidden' , holding ? 'opacity-90' : '' , props.className ) }
	>
		{ holding ? <span
			className="absolute inset-0 bg-foreground/10"
			style={ { transform : `scaleX(${ progress })` , transformOrigin : 'left center' } }
		/> : null }
		<span className="relative">{ props.children }</span>
	</Button>;
};

import { Button , type ButtonProps } from '#Views/shared/ui/button';
import { cn } from '#Views/shared/ui/cn.utility';
