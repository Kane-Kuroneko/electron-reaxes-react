/**
 * @description MainView 菜单栏键盘导航绑定（在 React 挂载前注册，避免 StrictMode 竞态）。
 */

type KeyboardNavDeps = {
	getOpenMenuIndex : () => number;
	closeAllMenus : () => void;
	openFirstMenu : () => void;
	moveTopMenu : ( delta : number ) => void;
	moveFocusedItem : ( delta : number ) => void;
	triggerFocusedItem : () => void;
};

let boundHandler : ( ( e : KeyboardEvent ) => void ) | null = null;

export const createKeyboardNavHandler = ( deps : KeyboardNavDeps ) => {
	return ( e : KeyboardEvent ) => {
		if( e.key === 'Alt' || e.key === 'F10' ) {
			e.preventDefault();
			if( deps.getOpenMenuIndex() >= 0 ) {
				deps.closeAllMenus();
			} else {
				deps.openFirstMenu();
			}
			return;
		}
		if( deps.getOpenMenuIndex() < 0 ) return;
		if( e.key === 'Escape' ) {
			e.preventDefault();
			deps.closeAllMenus();
			return;
		}
		if( e.key === 'ArrowRight' ) {
			e.preventDefault();
			deps.moveTopMenu( 1 );
			return;
		}
		if( e.key === 'ArrowLeft' ) {
			e.preventDefault();
			deps.moveTopMenu( -1 );
			return;
		}
		if( e.key === 'ArrowDown' ) {
			e.preventDefault();
			deps.moveFocusedItem( 1 );
			return;
		}
		if( e.key === 'ArrowUp' ) {
			e.preventDefault();
			deps.moveFocusedItem( -1 );
			return;
		}
		if( e.key === 'Enter' || e.key === ' ' ) {
			e.preventDefault();
			deps.triggerFocusedItem();
		}
	};
};

export const bindKeyboardNav = ( deps : KeyboardNavDeps ) => {
	unbindKeyboardNav();
	boundHandler = createKeyboardNavHandler( deps );
	window.addEventListener( 'keydown' , boundHandler );
};

export const unbindKeyboardNav = () => {
	if( !boundHandler ) return;
	window.removeEventListener( 'keydown' , boundHandler );
	boundHandler = null;
};
