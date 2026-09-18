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
				{/* 相邻 AI 的供应商 logo；label 已不含厂商名。见 ai-vendor-logo-identity.md */}
				{ item.adjacentVendor ? (
					<span className="main-view-bar-item__nav-vendor" data-vendor={ item.adjacentVendor.family } aria-hidden="true">
						<AIVendorLogo
							family={ item.adjacentVendor.family }
							size={ 14 }
							faviconUrl={ item.adjacentVendor.faviconUrl }
							fallbackText={ vendorFallbackText( item.adjacentVendor , displayName ) }
						/>
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


import { AIVendorLogo } from '#shared/ai-vendor-logo';
import { vendorFallbackText } from '#shared/ai-vendor-logo/vendor-logo.utility';
import type { MenuView } from '#src/Types/MenuView';
import { reaxper } from 'reaxes-react';
import { ChevronLeft , ChevronRight } from 'lucide-react';
