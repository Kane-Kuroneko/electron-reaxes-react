export const AdjacentNavButton = reaxper( ( {
	item ,
	onActivate ,
} : {
	item : MenuView.TopLevelItem;
	onActivate : () => void;
} ) => {
	const isNext = item.icon === 'chevron-right';
	const Icon = isNext ? ChevronRight : ChevronLeft;
	const displayName = item.adjacentLabel || item.label;
	const ariaLabel = item.adjacentLabel
		? `${ item.label }: ${ item.adjacentLabel }`
		: item.label;

	return (
		<div
			className="main-view-bar-item main-view-bar-item--nav"
			data-menu-id={ item.id }
			role="none"
		>
			<button
				className={ `main-view-bar-item__button main-view-bar-item__button--nav ${ isNext ? 'main-view-bar-item__button--nav-next' : 'main-view-bar-item__button--nav-prev' }` }
				role="menuitem"
				tabIndex={ -1 }
				disabled={ !item.enabled }
				aria-label={ ariaLabel }
				title={ ariaLabel }
				onMouseDown={ ( e ) => {
					if( e.button !== 0 ) return;
					e.preventDefault();
					e.stopPropagation();
					onActivate();
				} }
				onClick={ ( e ) => {
					e.preventDefault();
					e.stopPropagation();
				} }
			>
				{ !isNext ? (
					<span className="main-view-bar-item__nav-icon">
						<Icon size={ 13 } strokeWidth={ 2.25 } aria-hidden="true" />
					</span>
				) : null }
				<span className="main-view-bar-item__nav-name">{ displayName }</span>
				{ isNext ? (
					<span className="main-view-bar-item__nav-icon">
						<Icon size={ 13 } strokeWidth={ 2.25 } aria-hidden="true" />
					</span>
				) : null }
			</button>
		</div>
	);
} );


import { reaxper } from 'reaxes-react';
import { ChevronLeft , ChevronRight } from 'lucide-react';
import type { MenuView } from '#src/Types/MenuView';
