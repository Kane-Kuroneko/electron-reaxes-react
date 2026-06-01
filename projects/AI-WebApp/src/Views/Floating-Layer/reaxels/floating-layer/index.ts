export const reaxel_FloatingLayer = reaxel( () => {
	const { store , setState , mutate } = createReaxable( {
		switchAiBar : {
			visible : false ,
			direction : checkAs<FloatingLayer.SwitchAiBarDirection>( 'next' ) ,
			items : checkAs<FloatingLayer.SwitchAiBarItem[]>( [] ) ,
			currentId : '' ,
			sequence : 0 ,
			total : 0,
		},
	} );

	let hideTimer = checkAs<ReturnType<typeof setTimeout>>( null );

	const clearHideTimer = () => {
		if( hideTimer ) {
			clearTimeout( hideTimer );
			hideTimer = null;
		}
	};

	const hideSwitchAiBar = () => {
		clearHideTimer();
		setState.switchAiBar( {
			visible : false,
		} );
	};

	const showSwitchAiBar = (payload:FloatingLayer.SwitchAiBarPayload) => {
		clearHideTimer();
		setState.switchAiBar( {
			...payload ,
			visible : true,
		} );
		hideTimer = setTimeout( hideSwitchAiBar , 2000 );
	};

	const handleCommand = (command:FloatingLayer.Command) => {
		if( command.type === 'switch-ai-bar:show' ) {
			showSwitchAiBar( command.payload );
			return;
		}
		if( command.type === 'switch-ai-bar:hide' ) {
			hideSwitchAiBar();
		}
	};

	const rtn = {
		handleCommand ,
		showSwitchAiBar ,
		hideSwitchAiBar,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

import type { FloatingLayer } from '#src/Types/FloatingLayer';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
