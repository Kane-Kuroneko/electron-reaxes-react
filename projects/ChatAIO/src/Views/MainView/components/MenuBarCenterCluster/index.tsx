/**
 * 中区 Prev / Current AI / Next。
 * badge 只把左键抛给 reaxel（虚拟菜单 current-ai），不接 hover。
 * Settings 打开时 badge 零交互。
 * 设计：docs/features/menubar-current-ai-dropdown.md
 */
export const MenuBarCenterCluster = reaxper( () => {
	const { store } = reaxel_MainView;
	const {
		activateItem ,
		pressTopMenuItem ,
	} = reaxel_MainView();
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
				<CurrentContextBadge
					label={ currentContextLabel }
					isOpen={ store.openMenuId === CURRENT_AI_MENU_ID }
					interactive={ !store.settingsViewOpened }
					onPress={ () => pressTopMenuItem( CURRENT_AI_MENU_ID ) }
				/>
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


import { CURRENT_AI_MENU_ID } from '#MainView/reaxels/main-view/current-ai-menu.utility';
import { reaxel_MainView } from '#MainView/reaxels/main-view';
import { AdjacentNavButton } from '#MainView/components/AdjacentNavButton';
import { CurrentContextBadge } from '#MainView/components/CurrentContextBadge';
import { reaxper } from 'reaxes-react';
