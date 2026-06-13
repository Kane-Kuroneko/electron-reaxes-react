export const SwitchAiBar = reaxper( () => {
	const store = reaxel_FloatingView.store.switchAiBar;
	const visibilityClassName = store.visible ? 'switch-ai-bar--visible' : 'switch-ai-bar--hidden';

	return <section
		className={ `switch-ai-bar ${ visibilityClassName }` }
		aria-hidden={ !store.visible }
	>
		<div className="switch-ai-bar__viewport">
			{/* key={sequence} forces track remount, firing the horizontal-slide
			    CSS animation. data-direction selects leftward vs rightward slide. */}
			<div
				key={ store.sequence }
				className="switch-ai-bar__track"
				data-direction={ store.direction }
			>
				{ store.items.map( item => (
					<div
						key={ item.id }
						className={ `switch-ai-bar__item switch-ai-bar__item--${ item.position }` }
					>
						<span className="switch-ai-bar__label">{ item.label }</span>
						<span className="switch-ai-bar__family">{ item.family }</span>
					</div>
				) ) }
			</div>
		</div>
	</section>;
} );

import { reaxel_FloatingView } from '../../reaxels/floating-view';
import { reaxper } from 'reaxes-react';
