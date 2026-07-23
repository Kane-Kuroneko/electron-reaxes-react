export const MenuBarRightItems = reaxper( () => {
	const { store } = reaxel_MainView;
	if( !store.updateAvailable ) {
		return null;
	}

	return (
		<div className="main-view-bar__right">
			<button
				className="main-view-bar-item__button main-view-bar-item__button--update"
				type="button"
				role="menuitem"
				tabIndex={ -1 }
				aria-label="Update available"
				title="Update available"
				onMouseDown={ ( e ) => {
					if( e.button !== 0 ) return;
					e.preventDefault();
					e.stopPropagation();
					api.openSettingsVersion( 'latest' );
				} }
				onClick={ ( e ) => {
					e.preventDefault();
					e.stopPropagation();
				} }
			>
				<Download size={ 14 } strokeWidth={ 2.25 } aria-hidden="true" />
			</button>
		</div>
	);
} );


import { reaxel_MainView } from '#MainView/reaxels/main-view';
import { Download } from 'lucide-react';
import { reaxper } from 'reaxes-react';
