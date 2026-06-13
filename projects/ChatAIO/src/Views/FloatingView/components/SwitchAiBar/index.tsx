export const SwitchAiBar = reaxper( () => {
	const store = reaxel_FloatingView.store.switchAiBar;
	const visibilityClassName = store.visible ? 'switch-ai-bar--visible' : 'switch-ai-bar--hidden';

	/* ── Dual-track slide state ──
	   Instead of remounting the track (key={sequence}), we keep both
	   the old and new tracks in the DOM during a transition.  The exit
	   track slides out while the enter track slides in from the opposite
	   edge — both move by exactly one card slot, creating Swiper-style
	   continuous motion.

	   animKey increments on every switch and is used as the React key
	   on both tracks.  This forces CSS animations to restart even during
	   rapid successive switches — each press gets its own full animation.

	   Cleanup is driven by the exit track's native animationend event,
	   so the duration is whatever CSS defines (no hardcoded timeout). */

	const prevItemsRef = useRef<FloatingView.SwitchAiBarItem[]>( store.items );
	const prevSeqRef = useRef( store.sequence );
	const exitTrackRef = useRef<HTMLDivElement>( null );
	const [ exitTrack , setExitTrack ] = useState<{
		items : FloatingView.SwitchAiBarItem[];
		direction : FloatingView.SwitchAiBarDirection;
	} | null>( null );
	const [ animKey , setAnimKey ] = useState( 0 );

	/* Detect sequence change → snapshot old items → fire transition.
	   useLayoutEffect ensures the exit-track state is set before the
	   browser paints, so there's no single-frame flash. */
	useLayoutEffect( () => {
		if( store.sequence === prevSeqRef.current ) return;

		const oldItems = prevItemsRef.current;
		const newItems = store.items;
		const dir = store.direction;

		prevSeqRef.current = store.sequence;
		prevItemsRef.current = newItems;

		/* First payload — bar is empty, nothing to transition from. */
		if( !oldItems.length ) return;

		setExitTrack( { items : oldItems , direction : dir } );
		setAnimKey( k => k + 1 );
	} , [ store.sequence ] );

	/* Listen for the exit track's animationend event to know exactly
	   when the slide-out finishes.  The dependency on [exitTrack, animKey]
	   ensures the listener is re-bound every time a new animation starts
	   (or an in-progress one is replaced via key change). */
	useEffect( () => {
		if( !exitTrack ) return;
		const el = exitTrackRef.current;
		if( !el ) return;

		const onEnd = ( e : AnimationEvent ) => {
			/* Only react to the track's own animation, not bubbled
			   events from child cards. */
			if( e.target === el ) {
				setExitTrack( null );
			}
		};

		el.addEventListener( 'animationend' , onEnd );
		return () => el.removeEventListener( 'animationend' , onEnd );
	} , [ exitTrack , animKey ] );

	/* ── Render helpers ── */
	const renderCards = ( items : FloatingView.SwitchAiBarItem[] ) =>
		items.map( item => (
			<div
				key={ `${ item.id }-${ item.position }` }
				className={ `switch-ai-bar__item switch-ai-bar__item--${ item.position }` }
			>
				<span className="switch-ai-bar__label">{ item.label }</span>
				<span className="switch-ai-bar__family">{ item.family }</span>
			</div>
		) );

	return <section
		className={ `switch-ai-bar ${ visibilityClassName }` }
		aria-hidden={ !store.visible }
	>
		<div className="switch-ai-bar__viewport">
			{/* Exit track: absolutely-positioned overlay, slides out
			    and fades away to reveal the enter track underneath.
			    key={exit-${animKey}} forces React to remount this div
			    on every switch, restarting the CSS animation. */}
			{ exitTrack && (
				<div
					ref={ exitTrackRef }
					key={ `exit-${ animKey }` }
					className={ `switch-ai-bar__track switch-ai-bar__track--exit-${ exitTrack.direction }` }
				>
					{ renderCards( exitTrack.items ) }
				</div>
			) }
			{/* Enter track: normal flow (drives viewport height),
			    slides in from the opposite edge.  key changes on each
			    switch so the enter animation also restarts cleanly.
			    When idle (no exitTrack) the key is stable, avoiding
			    unnecessary remounts. */}
			<div
				key={ exitTrack ? `enter-${ animKey }` : 'enter' }
				className={ `switch-ai-bar__track${ exitTrack ? ` switch-ai-bar__track--enter-${ exitTrack.direction }` : '' }` }
			>
				{ renderCards( store.items ) }
			</div>
		</div>
	</section>;
} );

import { reaxel_FloatingView } from '../../reaxels/floating-view';
import type { FloatingView } from '#src/Types/FloatingView';
import { reaxper } from 'reaxes-react';
