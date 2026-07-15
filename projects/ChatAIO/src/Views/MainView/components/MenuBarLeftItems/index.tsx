export const MenuBarLeftItems = reaxper( () => {
	const { store } = reaxel_MainView;
	const {
		toggleMenu ,
		setOpenMenuIndex ,
		triggerAction ,
	} = reaxel_MainView();

	return (
		<div className="main-view-bar__left">
			{ store.leftMenuEntries.map( ( { item , originalIndex } ) => {
				const isOpen = store.openMenuIndex === originalIndex;
				return (
					<MenuBarItem
						key={ item.id }
						item={ item }
						index={ originalIndex }
						isOpen={ isOpen }
						onToggle={ () => toggleMenu( originalIndex , isOpen ) }
						onHover={ () => {
							if( store.openMenuIndex >= 0 ) {
								setOpenMenuIndex( originalIndex );
							}
						} }
						onItemAction={ triggerAction }
					/>
				);
			} ) }
		</div>
	);
} );


import { reaxel_MainView } from '../../reaxels/main-view';
import { MenuBarItem } from '../MenuBarItem';
import { reaxper } from 'reaxes-react';
