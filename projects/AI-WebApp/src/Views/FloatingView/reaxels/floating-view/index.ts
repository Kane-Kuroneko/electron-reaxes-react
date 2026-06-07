export const reaxel_FloatingView = reaxel( () => {
	const { store , setState , mutate } = createReaxable( {
		switchAiBar : {
			visible : false ,
			direction : checkAs<FloatingView.SwitchAiBarDirection>( 'next' ) ,
			items : checkAs<FloatingView.SwitchAiBarItem[]>( [] ) ,
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

	const showSwitchAiBar = (payload:FloatingView.SwitchAiBarPayload) => {
		clearHideTimer();
		setState.switchAiBar( {
			...payload ,
			visible : true,
		} );
		hideTimer = setTimeout( hideSwitchAiBar , 2000 );
	};

	const showGlobalMessage = (payload:FloatingView.GlobalMessagePayload) => {
		message.destroy();
		message[payload.type]( payload.content , payload.duration );
	};

	const handleCommand = (command:FloatingView.Command) => {
		if( command.type === 'switch-ai-bar:show' ) {
			showSwitchAiBar( command.payload );
			return;
		}
		if( command.type === 'switch-ai-bar:hide' ) {
			hideSwitchAiBar();
			return;
		}
		if( command.type === 'global-message:show' ) {
			showGlobalMessage( command.payload );
		}
	};

	const rtn = {
		handleCommand ,
		showSwitchAiBar ,
		hideSwitchAiBar ,
		showGlobalMessage,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

import type { FloatingView } from '#src/Types/FloatingView';
import { message } from 'antd';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
