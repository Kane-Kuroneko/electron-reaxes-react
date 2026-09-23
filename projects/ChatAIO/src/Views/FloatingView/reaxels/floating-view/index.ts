
/* 当前性能记录上下文 ID，供 SwitchAiBar 组件关联主进程与渲染进程的 perf 事件 */
let currentPerfCtxId = '';

export const getCurrentPerfCtxId = () => currentPerfCtxId;

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
		} ,
		/* overlay 自绘 toast，不拉 antd / Tailwind Preflight。见 docs/features/settings-ui-shadcn.md */
		overlayToast : {
			visible : false ,
			type : checkAs<FloatingView.GlobalMessagePayload['type']>( 'info' ) ,
			content : '',
		},
	} );

	const AUTO_HIDE_MS = 2000;
	let hideTimer = checkAs<ReturnType<typeof setTimeout>>( null );
	let toastTimer = checkAs<ReturnType<typeof setTimeout>>( null );
	/* 隐藏条上的 Next 要先亮出当前卡，再改下标。后一次 show 作废上一次尚未播出的滑动。 */
	let revealThenSlideGeneration = 0;

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
		traceCarouselOp( {
			kind : 'command' ,
			command : 'hide' ,
			ctxId : currentPerfCtxId || '' ,
			activeIndex : store.switchAiBar.activeIndex ,
			direction : store.switchAiBar.direction ,
			visible : false ,
			itemIds : store.switchAiBar.items.map( ( item ) => item.id ) ,
			itemLabels : store.switchAiBar.items.map( ( item ) => item.label ) ,
		} );
	};

	/** 仅写入卡片数据以挂载 Swiper，保持 hidden——用于启动预热。菜单停靠也走这里，不弹出。 */
	const prepareSwitchAiBar = (payload:FloatingView.SwitchAiBarPayload) => {
		const fingerprint = switchAiBarItemsFingerprint(
			payload.items ,
			payload.source ?? 'unknown',
		);
		perf.mark( PerfPhase.FvPrepareApplied , 'renderer' , currentPerfCtxId || 'boot' , {
			...fingerprint ,
			activeIndex : payload.activeIndex ,
			prevItemCount : store.switchAiBar.items.length ,
		} );
		setState.switchAiBar( {
			visible : false ,
			items : payload.items ,
			activeIndex : payload.activeIndex ,
			direction : payload.direction,
		} );
		traceCarouselOp( {
			kind : 'command' ,
			command : 'prepare' ,
			ctxId : payload.ctxId || currentPerfCtxId || '' ,
			activeIndex : payload.activeIndex ,
			direction : payload.direction ,
			source : payload.source || 'unknown' ,
			visible : false ,
			itemIds : payload.items.map( ( item ) => item.id ) ,
			itemLabels : payload.items.map( ( item ) => item.label ) ,
		} );
		perf.flush();
	};

	const showSwitchAiBar = (payload:FloatingView.SwitchAiBarPayload) => {
		clearHideTimer();
		currentPerfCtxId = payload.ctxId || '';
		const prevItems = store.switchAiBar.items;
		const prevItemCount = prevItems.length;
		const fromIndex = store.switchAiBar.activeIndex;
		const hidden = store.switchAiBar.visible !== true;
		const currentId = fromIndex >= 0 && fromIndex < prevItemCount
			? prevItems[fromIndex]?.id
			: '';
		/* 中区 Next 走已打开列表，下标和隐藏时停靠的启用列表不是同一套。
		   必须按当前卡的 id 在新列表里找位置，先亮出这张卡，再滑到下一张。
		   若直接用目标下标重建，整条会突然出现在终点，没有滚动。
		   见 docs/issues/floating-view-carousel-absolute-select.md */
		const holdIndex = currentId
			? payload.items.findIndex( ( item ) => item.id === currentId )
			: -1;
		const holdFromCard = hidden
			&& holdIndex >= 0
			&& holdIndex !== payload.activeIndex;
		const fingerprint = switchAiBarItemsFingerprint(
			payload.items ,
			payload.source ?? 'unknown',
		);
		const prevFingerprint = switchAiBarItemsFingerprint( prevItems );
		const itemsChanged = prevFingerprint.idsHash !== fingerprint.idsHash
			|| prevItemCount !== fingerprint.itemCount;
		const sameList = prevItemCount === payload.items.length
			&& prevItems.every( ( item , index ) => item.id === payload.items[index]?.id );
		const applyShow = ( activeIndex:number , replaceItems:boolean ) => {
			if( replaceItems ) {
				setState.switchAiBar( {
					visible : true ,
					items : payload.items ,
					activeIndex ,
					direction : payload.direction,
				} );
				return;
			}
			setState.switchAiBar( {
				visible : true ,
				activeIndex ,
				direction : payload.direction,
			} );
		};
		if( holdFromCard && sameList ) {
			const generation = ++revealThenSlideGeneration;
			applyShow( holdIndex , false );
			setTimeout( () => {
				if( generation !== revealThenSlideGeneration ) {
					return;
				}
				applyShow( payload.activeIndex , false );
			} , 50 );
		} else if( holdFromCard ) {
			const generation = ++revealThenSlideGeneration;
			/* 换列表才重建 Swiper。让出当前栈，中心页先画出来；重建时条仍隐藏。 */
			setTimeout( () => {
				if( generation !== revealThenSlideGeneration ) {
					return;
				}
				setState.switchAiBar( {
					visible : false ,
					items : payload.items ,
					activeIndex : holdIndex ,
					direction : payload.direction,
				} );
				setTimeout( () => {
					if( generation !== revealThenSlideGeneration ) {
						return;
					}
					applyShow( holdIndex , false );
					setTimeout( () => {
						if( generation !== revealThenSlideGeneration ) {
							return;
						}
						applyShow( payload.activeIndex , false );
					} , 50 );
				} , 0 );
			} , 0 );
		} else {
			revealThenSlideGeneration++;
			applyShow( payload.activeIndex , sameList === false );
		}
		traceCarouselOp( {
			kind : 'command' ,
			command : 'show' ,
			ctxId : currentPerfCtxId ,
			activeIndex : payload.activeIndex ,
			direction : payload.direction ,
			source : payload.source || 'unknown' ,
			visible : true ,
			itemIds : payload.items.map( ( item ) => item.id ) ,
			itemLabels : payload.items.map( ( item ) => item.label ) ,
		} );
		perf.mark( PerfPhase.SwitchUiUpdated , 'renderer' , currentPerfCtxId , {
			...fingerprint ,
			activeIndex : payload.activeIndex ,
			itemsChanged ,
			prevItemCount ,
			holdFromCard ,
		} );
		hideTimer = setTimeout( hideSwitchAiBar , AUTO_HIDE_MS );
	};

	const showGlobalMessage = (payload:FloatingView.GlobalMessagePayload) => {
		if( toastTimer ) {
			clearTimeout( toastTimer );
			toastTimer = null;
		}
		setState.overlayToast( {
			visible : true ,
			type : payload.type ,
			content : payload.content,
		} );
		const durationMs = ( payload.duration ?? 3 ) * 1000;
		toastTimer = setTimeout( () => {
			setState.overlayToast( { visible : false } );
			toastTimer = null;
		} , durationMs );
	};

	const handleCommand = (command:FloatingView.Command) => {
		if( command.type === 'switch-ai-bar:prepare' ) {
			prepareSwitchAiBar( command.payload );
			return;
		}
		if( command.type === 'switch-ai-bar:show' ) {
			const fingerprint = switchAiBarItemsFingerprint(
				command.payload.items ,
				command.payload.source ?? 'unknown',
			);
			perf.mark( PerfPhase.SwitchIpcReceived , 'renderer' , command.payload.ctxId || '' , {
				action : command.payload.ctxId ? 'switch' : 'unknown' ,
				...fingerprint ,
			} );
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
		prepareSwitchAiBar ,
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
import { traceCarouselOp } from '#FloatingView/utils/carousel-trace.utility';
import {
	perf ,
	PerfPhase ,
	switchAiBarItemsFingerprint,
} from '#shared/utils/switch-perf-recorder.utility';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
