export const MenuBarCenterCluster = reaxper( () => {
	const { store } = reaxel_MainView;
	const { activateItem } = reaxel_MainView();
	const { centerNav , currentContextLabel } = store;

	if( !centerNav && !currentContextLabel ) {
		return null;
	}

	return (
		<div className="main-view-bar__center">
			{ centerNav ? (
				<AdjacentNavButton
					item={ centerNav.prev.item }
					onActivate={ () => activateItem( centerNav.prev.item ) }
				/>
			) : null }
			{ currentContextLabel ? (
				<CurrentContextBadge label={ currentContextLabel } />
			) : null }
			{ centerNav ? (
				<AdjacentNavButton
					item={ centerNav.next.item }
					onActivate={ () => activateItem( centerNav.next.item ) }
				/>
			) : null }
		</div>
	);
} );


import { reaxel_MainView } from '#MainView/reaxels/main-view';
import { AdjacentNavButton } from '#MainView/components/AdjacentNavButton';
import { CurrentContextBadge } from '#MainView/components/CurrentContextBadge';
import { reaxper } from 'reaxes-react';
