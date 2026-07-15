let dismissDropdownHandler:( () => void ) | null = null;

export const setMenubarDropdownDismissHandler = ( handler:( () => void ) | null ) => {
	dismissDropdownHandler = handler;
};

export const dismissMenubarDropdownIfOpen = () => {
	dismissDropdownHandler?.();
};

