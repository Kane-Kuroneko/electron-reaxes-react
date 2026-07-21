export const MenuBarLeftItems = reaxper( () => {
	const { store } = reaxel_MainView;
	const {
		pressTopMenuItem ,
		hoverTopMenuItem ,
	} = reaxel_MainView();

	return (
		<div className="main-view-bar__left">
			{ store.leftMenuEntries.map( ( { item } , i ) => (
				<MenuBarItem
					key={ item.id }
					item={ item }
					isFirst={ i === 0 }
					isOpen={ store.openMenuId === item.id }
					onPress={ () => pressTopMenuItem( item.id ) }
					onHover={ () => hoverTopMenuItem( item.id ) }
				/>
			) ) }
		</div>
	);
} );


import { reaxel_MainView } from '#MainView/reaxels/main-view';
import { MenuBarItem } from '#MainView/components/MenuBarItem';
import { reaxper } from 'reaxes-react';
