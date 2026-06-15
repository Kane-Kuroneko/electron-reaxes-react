export const reaxel_FloatingView = reaxel( () => {
	const { store , setState , mutate } = createReaxable( {
		switchAiBar : {
			visible : false ,
			/* 全部活跃 AI 项（按用户顺序）；Swiper 以它们为稳定 slide 列表 */
			items : checkAs<FloatingView.SwitchAiBarItem[]>( [] ) ,
			/* 当前活跃 AI 在 items 中的索引 */
			activeIndex : 0 ,
			/* 用户切换方向；Swiper 据此调用 slideNext()/slidePrev() */
			direction : checkAs<FloatingView.SwitchAiBarDirection>( 'next' ) ,
		},
	} );

	const AUTO_HIDE_MS = 2000;
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
			visible : true ,
			items : payload.items ,
			activeIndex : payload.activeIndex ,
			direction : payload.direction,
		} );
		hideTimer = setTimeout( hideSwitchAiBar , AUTO_HIDE_MS );
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
