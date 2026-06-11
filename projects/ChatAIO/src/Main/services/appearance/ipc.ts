let registered = false;

export const registerAppearanceIpc = () => {
	if( registered ) return;
	registered = true;
	useIpcRpc( 'get-appearance-environment' ).handle( async() => {
		return getAppearanceEnvironment();
	} );
};

import { useIpcRpc } from '#main/services/ipc';
import { getAppearanceEnvironment } from './index';
