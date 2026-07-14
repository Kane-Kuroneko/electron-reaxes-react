export const MenuBar = reaxper( () => {
	const { handleBarMouseDown , handleDragTailMouseDown } = reaxel_MainView();

	return (
		<div
			className="main-view-bar"
			role="menubar"
			aria-label="Application Menu"
			onMouseDown={ handleBarMouseDown }
		>
			<MenuBarLeftItems />
			<div
				className="main-view-bar__drag-tail"
				aria-hidden="true"
				onMouseDown={ handleDragTailMouseDown }
			/>
		</div>
	);
} );


import { reaxel_MainView } from '../../reaxels/main-view';
import { MenuBarLeftItems } from '../MenuBarLeftItems';
import { reaxper } from 'reaxes-react';
