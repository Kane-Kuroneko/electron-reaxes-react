export const MenuBarCenterCluster = reaxper( () => {
	const { store } = reaxel_MainView;
	const { triggerAction } = reaxel_MainView();
	const { centerNav , currentContextLabel } = store;

	if( !centerNav && !currentContextLabel ) {
		return null;
	}

	return (
		<div className="main-view-bar__center">
			{ centerNav ? (
				<AdjacentNavButton
					item={ centerNav.prev.item }
					index={ centerNav.prev.originalIndex }
					onItemAction={ triggerAction }
				/>
			) : null }
			{ currentContextLabel ? (
				<CurrentContextBadge label={ currentContextLabel } />
			) : null }
			{ centerNav ? (
				<AdjacentNavButton
					item={ centerNav.next.item }
					index={ centerNav.next.originalIndex }
					onItemAction={ triggerAction }
				/>
			) : null }
		</div>
	);
} );


import { reaxel_MainView } from '../../reaxels/main-view';
import { AdjacentNavButton } from '../AdjacentNavButton';
import { CurrentContextBadge } from '../CurrentContextBadge';
import { reaxper } from 'reaxes-react';
