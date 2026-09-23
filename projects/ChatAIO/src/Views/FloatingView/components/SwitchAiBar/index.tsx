/* ── SwitchAiBar (Swiper + Interrupt & Redirect 策略) ──
   以 Swiper 12 实现 AI 切换卡片轮播，通过「中断重定向 + 方向短动画」策略
   解决高频切换时的卡顿与方向感知问题。

   核心契约：
   - 向前（next）→ 卡片永远向左移动
   - 向后（previous）→ 卡片永远向右移动
   - 到边界时通过 Swiper loop 无缝循环，永不跳卡
   - 3 或 5 个视觉位置始终占满

   Interrupt & Redirect 策略：
   - loopPreventsSliding: false → 动画进行中仍允许 slideNext/slidePrev
   - 慢速切换（间隔 > RAPID_THRESHOLD）：300ms 标准动画，方向清晰
   - 快速切换（间隔 ≤ RAPID_THRESHOLD）：120ms 短动画，方向清晰
   - 每次新切换的 slideNext/slidePrev 调用会让 CSS transition 从当前位置
     重新开始向新目标动画——浏览器原生 transition 中断重定向，零排队零丢帧
   - 彻底消除 pending 队列——不需要排队，每次切换直接执行

   两种呈现（docs/issues/floating-view-carousel-absolute-select.md）：
   - 顺序切换：可见，只调用一次 slideNext() / slidePrev()
   - 菜单绝对选中：不弹出。隐藏时换 key，用 initialSlide 停到当前 AI
   禁止 slideTo / slideToLoop：loop 克隆没有 React 卡片内容，滑过去就是空项。

   loop 缓冲翻倍（loopAdditionalSlides）：
   centeredSlides 下 Swiper 默认 loopedSlides = ceil(slidesPerView/2)；追加等量
   loopAdditionalSlides 将 clone 缓冲翻倍，减少 loopFix 在边界处重排 DOM 的频率，
   避免 DOM 位置突变导致 data-position 偏移错位。

   视觉同步（立即跟随 slide）：
   data-position 以 swiper.activeIndex 为基准计算偏移（loopFix 后会同步修正），
   在 onSlideChange 中即时更新，卡片缩放/色彩随 Swiper 滑动同步过渡。

   动画参数：见下方 ANIM 常量块，与 index.less 顶部变量同步调试。

   架构不变：reaxel 管理 UI 状态 + 2s 自动隐藏；IPC 不变。 */

/* ═════════════════════════════════════════════════════════
   ANIM — 动画参数（在此集中调试）
   标注 "⇄ CSS" 的参数需与 index.less 顶部同名变量保持同步
   ═════════════════════════════════════════════════════════ */
const ANIM = {
	/* loop clone 缓冲追加量：centeredSlides 默认 loopedSlides 翻倍 */
	LOOP_ADD_SLIDES      : Math.ceil( /* slidesPerView */ 5 / 2 ) /* = 3 */ ,
	/* Swiper 滑动过渡时长 (ms) — 慢速单步切换使用 */
	SWIPER_SPEED         : 300 ,
	/* 卡片间距 (px) */
	CARD_GAP             : 2 ,
	/* 快速切换检测阈值 (ms)：两次 activeIndex 变化间隔 ≤ 此值时进入快速模式。
	   设为略小于 SWIPER_SPEED，确保"上一动画还没结束就来新指令"时触发快速模式。 */
	RAPID_THRESHOLD      : 250 ,
	/* 快速模式 Swiper 滑动速度 (ms)：足够短以避免排队，足够长以看到方向
	   ⇄ CSS @rapid-transition-duration */
	RAPID_SPEED          : 120 ,
	/* ↓ 以下仅作文档参考，实际生效值在 index.less 顶部 LESS 变量 */
	/* ⇄ CSS @settle-duration — 卡片缩放过渡时长 (ms) */
	SETTLE_DURATION      : 300 ,
	/* ⇄ CSS @settle-easing   — 卡片缩放缓动 */
	SETTLE_EASING        : checkAs<import('csstype').DataType.EasingFunction>('cubic-bezier(0.25, 0.8, 0.25, 1)') ,
};

export const SwitchAiBar = reaxper( () => {
	const store = reaxel_FloatingView.store.switchAiBar;
	const { items , activeIndex , direction , visible } = store;
	const visibilityClassName = visible ? 'switch-ai-bar--visible' : 'switch-ai-bar--hidden';

	const swiperRef = useRef<SwiperClass>( null );
	/* 隐藏停靠点。epoch 只在 park 时 +1，用来换 Swiper key，而不是去 slideTo。 */
	const cursorRef = useRef( {
		index : activeIndex ,
		ids : items.map( item => item.id ) ,
		epoch : 0 ,
	} );
	/* 最近一次 park/step。transitionEnd 时游标可能已经对齐，不能被随后的 idle 渲染清掉。 */
	const motionRef = useRef<CarouselFramePlan>( {
		presentation : 'idle' ,
		animation : 'none' ,
		steps : 0 ,
		remount : false ,
		fromIndex : activeIndex ,
		toIndex : activeIndex ,
		ringDistance : 0 ,
		nextCursor : {
			index : activeIndex ,
			ids : items.map( item => item.id ) ,
			epoch : 0 ,
		} ,
	} );
	const itemsRef = useRef( items );
	itemsRef.current = items;
	/* activeIndexRef 始终跟随最新 activeIndex —— 供 handleSwiper 等稳定回调中读取 */
	const activeIndexRef = useRef( activeIndex );
	activeIndexRef.current = activeIndex;
	const visibleRef = useRef( visible );
	visibleRef.current = visible;
	/* 本帧开始前条是否还藏着。从隐藏进入 step 时先无过渡亮出上一张，再滑。 */
	const barWasHiddenRef = useRef( true );
	const directionRef = useRef( direction );
	directionRef.current = direction;
	const hadSwiperBeginRef = useRef( false );
	const firstShowMonitorRef = useRef<ReturnType<typeof startFirstShowMonitor>>( null );

	/* ═════════════════════════════════════════════════════════
	   快速切换检测 — 跟踪最近一次 activeIndex 变化的时间
	   ═════════════════════════════════════════════════════════ */
	const lastSwitchTimeRef = useRef( 0 );
	/* rapid 模式标识：控制 CSS class 切换卡片过渡时长 */
	const [ isRapidMode , setIsRapidMode ] = useState( false );
	/* rapid 模式退出定时器：在最后一次快速切换后等待一段时间退出 */
	const rapidExitTimerRef = useRef<ReturnType<typeof setTimeout>>( null );

	/* ═════════════════════════════════════════════════════════
	   slidesPerView — 与旧实现一致
	   ═════════════════════════════════════════════════════════ */
	const total = items.length;
	/* 第一份 dup0 的顺序就是 items。重复份数见 buildCarouselDisplayItems。 */
	const { slidesPerView , displayItems } = buildCarouselDisplayItems( items );

	/* key 随 total 变化递增，强制 Swiper 重建（AI 增删时） */
	const swiperKeyRef = useRef( 0 );
	const prevTotalRef = useRef( total );
	if( prevTotalRef.current !== total ) {
		const prevTotal = prevTotalRef.current;
		const prevIndex = cursorRef.current.index;
		prevTotalRef.current = total;
		swiperKeyRef.current++;
		const nextIds = items.map( item => item.id );
		cursorRef.current = {
			index : activeIndex ,
			ids : nextIds ,
			epoch : cursorRef.current.epoch ,
		};
		/* 可见期重建是首次卡顿的核心嫌疑；立即落盘便于分析器检出 */
		perf.mark( PerfPhase.SwitchSwiperRemount , 'renderer' , getCurrentPerfCtxId() || 'boot' , {
			prevTotal ,
			nextTotal : total ,
			visible ,
		} );
		perf.flush();
		/* 隐藏时列表变长（菜单从已打开页换成 configured）也是停靠，不播动画。 */
		if( visible !== true && total > 0 ) {
			const remountFrame : CarouselFramePlan = {
				presentation : 'park' ,
				animation : 'none' ,
				steps : 0 ,
				remount : true ,
				fromIndex : prevIndex ,
				toIndex : activeIndex ,
				ringDistance : ringSteps( prevIndex , activeIndex , total , direction ) ,
				nextCursor : {
					index : activeIndex ,
					ids : nextIds.slice() ,
					epoch : cursorRef.current.epoch ,
				} ,
			};
			motionRef.current = remountFrame;
			const centerId = nextIds[activeIndex] || '';
			traceCarouselOp( {
				kind : 'frame' ,
				gesture : 'park' ,
				reason : 'list-length' ,
				ctxId : getCurrentPerfCtxId() || '' ,
				presentation : 'park' ,
				animation : 'none' ,
				steps : 0 ,
				visible ,
				direction ,
				fromIndex : prevIndex ,
				toIndex : activeIndex ,
				ringDistance : remountFrame.ringDistance ,
				activeIndex ,
				itemIds : nextIds ,
				itemLabels : items.map( item => item.label ) ,
				expectedCenterId : centerId ,
				swiperKey : `${ swiperKeyRef.current }-${ cursorRef.current.epoch }` ,
				faults : detectCarouselOpFaults( {
					gesture : 'park' ,
					visible ,
					animation : 'none' ,
					steps : 0 ,
					direction ,
					ringDistance : remountFrame.ringDistance ,
					itemIds : nextIds ,
					expectedCenterId : centerId ,
				} ) ,
			} );
		}
	}
	const targetIds = items.map( item => item.id );
	const itemLabels = items.map( item => item.label );
	/* 菜单 / prepare 都是隐藏更新：重建到 initialSlide，不滑、不弹出。 */
	const frame = planCarouselFrame( {
		visible ,
		cursor : cursorRef.current ,
		targetIndex : activeIndex ,
		targetIds ,
		direction ,
	} );
	if( frame.presentation !== 'idle' ) {
		motionRef.current = frame;
	}
	if( frame.presentation === 'park' ) {
		cursorRef.current = {
			index : frame.nextCursor.index ,
			ids : frame.nextCursor.ids.slice() ,
			epoch : frame.nextCursor.epoch ,
		};
		const centerId = targetIds[activeIndex] || '';
		traceCarouselOp( {
			kind : 'frame' ,
			gesture : 'park' ,
			ctxId : getCurrentPerfCtxId() || '' ,
			presentation : frame.presentation ,
			animation : frame.animation ,
			steps : frame.steps ,
			visible ,
			direction ,
			fromIndex : frame.fromIndex ,
			toIndex : frame.toIndex ,
			ringDistance : frame.ringDistance ,
			activeIndex ,
			itemIds : targetIds ,
			itemLabels ,
			expectedCenterId : centerId ,
			swiperKey : `${ swiperKeyRef.current }-${ cursorRef.current.epoch }` ,
			faults : detectCarouselOpFaults( {
				gesture : 'park' ,
				visible ,
				animation : frame.animation ,
				steps : frame.steps ,
				direction ,
				ringDistance : frame.ringDistance ,
				itemIds : targetIds ,
				expectedCenterId : centerId ,
			} ) ,
		} );
	}
	const swiperKey = `${ swiperKeyRef.current }-${ cursorRef.current.epoch }`;
	/* 从隐藏亮出时不要播容器淡入，否则 slide 发生在看不见的时候，条一出现已经停在终点。 */
	const revealFromHidden = visible === true && barWasHiddenRef.current;
	barWasHiddenRef.current = visible !== true;

	/* ═════════════════════════════════════════════════════════
	   data-position 驱动 CSS 缩放 / 透明度 / 渐变色
	   以 swiper.activeIndex 为基准计算偏移——loop 模式下 activeIndex
	   指向 clone 扩充后 slide 数组中的实际位置，loopFix 重排 DOM 后
	   Swiper 内部会同步修正 activeIndex，始终指向居中的活跃卡片。 */
	const updateSlidePositions = ( swiper : SwiperClass ) => {
		const slides = swiper.slides;
		const totalSlides = slides.length;
		const halfTotal = totalSlides / 2;
		const activeDomIndex = swiper.activeIndex;
		swiper.slides.forEach( ( slide , i ) => {
			let offset = i - activeDomIndex;
			/* 环绕修正：超出半长的偏移翻转符号 */
			if( offset > halfTotal ) {
				offset -= totalSlides;
			} else if( offset < -halfTotal ) {
				offset += totalSlides;
			}
			let position : string;
			if( offset === 0 ) {
				position = 'current';
			} else if( offset === -1 ) {
				position = 'near-prev';
			} else if( offset === 1 ) {
				position = 'near-next';
			} else if( offset <= -2 ) {
				position = 'far-prev';
			} else {
				position = 'far-next';
			}
			slide.setAttribute( 'data-position' , position );
		} );
	};

	/* ═════════════════════════════════════════════════════════
	   slide 切换：即时更新 data-position
	   卡片缩放/色彩随 Swiper 滑动同步过渡，不等待 transitionEnd */
	const handleSlideChange = useCallback( ( swiper : SwiperClass ) => {
		updateSlidePositions( swiper );
	} , [] );

	/* ════════════════════════════════════════════════════════
	   transition 结束：区分过早 complete（loopFix）与真正结束 */
	const handleTransitionEnd = useCallback( ( swiper : SwiperClass ) => {
		const ctxId = getCurrentPerfCtxId();
		const expectedActiveIndex = activeIndexRef.current;
		const realIndex = swiper.realIndex;
		const hadBegin = hadSwiperBeginRef.current;
		const monitorMeta = firstShowMonitorRef.current?.noteComplete( {
			realIndex ,
			expectedActiveIndex ,
			hadSwiperBegin : hadBegin ,
		} );
		const isFinal = monitorMeta?.isFinal
			?? ( hadBegin && realIndex === expectedActiveIndex );
		const premature = monitorMeta?.premature ?? !isFinal;

		perf.mark( PerfPhase.SwitchSwiperEnd , 'renderer' , ctxId , {
			realIndex ,
			expectedActiveIndex ,
			isFinal ,
			premature ,
		} );
		perf.mark( PerfPhase.SwitchComplete , 'renderer' , ctxId , {
			activeIndex : expectedActiveIndex ,
			realIndex ,
			isFinal ,
			premature ,
			msFromVisible : monitorMeta?.msFromVisible ,
		} );
		perf.flush();
		const motion = motionRef.current;
		const latestItems = itemsRef.current;
		const latestIds = latestItems.map( item => item.id );
		traceCarouselDom( {
			ctxId : ctxId || '' ,
			reason : 'transition-end' ,
			gesture : motion.presentation === 'step' ? 'step' : motion.presentation === 'park' ? 'park' : 'idle' ,
			activeIndex : expectedActiveIndex ,
			direction : directionRef.current ,
			itemIds : latestIds ,
			itemLabels : latestItems.map( item => item.label ) ,
			expectedCenterId : latestIds[expectedActiveIndex] || '' ,
			animation : motion.animation ,
			steps : motion.steps ,
			ringDistance : motion.ringDistance ,
		} );
	} , [] );

	/* ── Swiper 实例就绪 ──
	   initialSlide 已停在 store 目标上；视觉游标在渲染期和这份下标对齐，
	   这里不再补滑。运动只由下面的 effect 按规划执行。 */
	const handleSwiper = useCallback( ( swiper : SwiperClass ) => {
		swiperRef.current = swiper;
		updateSlidePositions( swiper );
		const ctxId = getCurrentPerfCtxId() || 'boot';
		perf.mark( PerfPhase.FvSwiperMounted , 'renderer' , ctxId , {
			totalSlides : swiper.slides.length ,
			visible : visibleRef.current ,
		} );
		perf.mark( PerfPhase.SwitchRenderDone , 'renderer' , ctxId , {
			totalSlides : swiper.slides.length,
		} );
		perf.flush();
	} , [] );

	/* 可见时的下标变化 = 顺序一格。隐藏停靠已在渲染期换 key，这里不再滑。
	   见 docs/issues/floating-view-carousel-absolute-select.md */
	useEffect( () => {
		if( !visible || total < 1 ) {
			return;
		}
		const stepIds = items.map( item => item.id );
		const stepLabels = items.map( item => item.label );
		const stepFrame = planCarouselFrame( {
			visible ,
			cursor : cursorRef.current ,
			targetIndex : activeIndex ,
			targetIds : stepIds ,
			direction ,
		} );
		if( stepFrame.presentation !== 'step' ) {
			return;
		}
		motionRef.current = stepFrame;

		const prevIndex = cursorRef.current.index;
		const prevIds = cursorRef.current.ids;
		cursorRef.current = {
			index : stepFrame.nextCursor.index ,
			ids : stepFrame.nextCursor.ids.slice() ,
			epoch : stepFrame.nextCursor.epoch ,
		};

		const now = performance.now();
		const elapsed = now - lastSwitchTimeRef.current;
		lastSwitchTimeRef.current = now;
		const isRapid = elapsed <= ANIM.RAPID_THRESHOLD && elapsed > 0;
		const speed = isRapid ? ANIM.RAPID_SPEED : ANIM.SWIPER_SPEED;
		if( !switchProfiler.isActive ) {
			switchProfiler.startSession();
		}

		perf.mark( PerfPhase.SwitchActiveIndex , 'renderer' , getCurrentPerfCtxId() , {
			prevIndex ,
			activeIndex ,
			direction ,
			kind : 'step' ,
			isRapid ,
			speed ,
			elapsed : Math.round( elapsed ) ,
			steps : 1 ,
			ringDistance : stepFrame.ringDistance ,
		} );

		const swiper = swiperRef.current;
		const centerId = stepIds[activeIndex] || '';
		if( !swiper || swiper.destroyed ) {
			cursorRef.current = {
				index : prevIndex ,
				ids : prevIds ,
				epoch : cursorRef.current.epoch ,
			};
			traceCarouselOp( {
				kind : 'frame' ,
				gesture : 'step' ,
				ctxId : getCurrentPerfCtxId() || '' ,
				presentation : stepFrame.presentation ,
				animation : 'aborted' ,
				steps : 0 ,
				visible ,
				direction ,
				fromIndex : stepFrame.fromIndex ,
				toIndex : stepFrame.toIndex ,
				ringDistance : stepFrame.ringDistance ,
				activeIndex ,
				itemIds : stepIds ,
				itemLabels : stepLabels ,
				expectedCenterId : centerId ,
				speed ,
				faults : detectCarouselOpFaults( {
					gesture : 'step' ,
					visible ,
					animation : 'aborted' ,
					steps : 0 ,
					direction ,
					ringDistance : stepFrame.ringDistance ,
					itemIds : stepIds ,
					expectedCenterId : centerId ,
				} ) ,
			} );
			return;
		}

		hadSwiperBeginRef.current = true;
		if( stepFrame.animation === 'slideNext' ) {
			swiper.slideNext( speed );
		} else {
			swiper.slidePrev( speed );
		}
		traceCarouselOp( {
			kind : 'frame' ,
			gesture : 'step' ,
			ctxId : getCurrentPerfCtxId() || '' ,
			presentation : stepFrame.presentation ,
			animation : stepFrame.animation ,
			steps : stepFrame.steps ,
			visible ,
			direction ,
			fromIndex : stepFrame.fromIndex ,
			toIndex : stepFrame.toIndex ,
			ringDistance : stepFrame.ringDistance ,
			activeIndex ,
			itemIds : stepIds ,
			itemLabels : stepLabels ,
			expectedCenterId : centerId ,
			speed ,
			faults : detectCarouselOpFaults( {
				gesture : 'step' ,
				visible ,
				animation : stepFrame.animation ,
				steps : stepFrame.steps ,
				direction ,
				ringDistance : stepFrame.ringDistance ,
				itemIds : stepIds ,
				expectedCenterId : centerId ,
			} ) ,
		} );
		firstShowMonitorRef.current?.noteCssTransitionStart( {
			direction ,
			speed ,
			steps : 1 ,
		} );

		if( isRapid ) {
			if( !isRapidMode ) {
				setIsRapidMode( true );
			}
			if( rapidExitTimerRef.current ) {
				clearTimeout( rapidExitTimerRef.current );
			}
			rapidExitTimerRef.current = setTimeout( () => {
				setIsRapidMode( false );
				rapidExitTimerRef.current = null;
			} , ANIM.SWIPER_SPEED );
			switchProfiler.recordRapidJump();
		} else if( isRapidMode ) {
			setIsRapidMode( false );
			if( rapidExitTimerRef.current ) {
				clearTimeout( rapidExitTimerRef.current );
				rapidExitTimerRef.current = null;
			}
		}

		perf.mark( PerfPhase.SwitchSwiperBegin , 'renderer' , getCurrentPerfCtxId() , {
			direction ,
			speed ,
			steps : 1 ,
			kind : 'step' ,
			isRapid ,
		} );
	} , [ activeIndex , direction , visible , items , total ] );

	/* 提交后记一帧 DOM：卡片顺序、data-position、中心卡是否为空。平时操作也落盘。 */
	useEffect( () => {
		let cancelled = false;
		const raf = requestAnimationFrame( () => {
			if( cancelled ) {
				return;
			}
			const motion = motionRef.current;
			const gesture = frame.presentation === 'step'
				? 'step'
				: frame.presentation === 'park'
					? 'park'
					: 'idle';
			traceCarouselDom( {
				ctxId : getCurrentPerfCtxId() || '' ,
				reason : 'commit' ,
				gesture ,
				activeIndex ,
				direction ,
				itemIds : targetIds ,
				itemLabels ,
				expectedCenterId : targetIds[activeIndex] || '' ,
				animation : frame.presentation === 'idle' ? 'none' : motion.animation ,
				steps : frame.presentation === 'idle' ? 0 : motion.steps ,
				ringDistance : frame.ringDistance ,
			} );
		} );
		return () => {
			cancelled = true;
			cancelAnimationFrame( raf );
		};
	} , [ swiperKey , activeIndex , visible , direction , items , frame.presentation , frame.fromIndex , frame.toIndex , frame.ringDistance ] );

	/* ── 可见后：首帧 + LoAF + 冷启动首次调出专项采样 ── */
	useEffect( () => {
		if( !visible ) {
			return;
		}
		const ctxId = getCurrentPerfCtxId();
		hadSwiperBeginRef.current = false;
		let cancelled = false;
		let raf1 = 0;
		let raf2 = 0;
		raf1 = requestAnimationFrame( () => {
			raf2 = requestAnimationFrame( () => {
				if( cancelled ) return;
				perf.mark( PerfPhase.SwitchFirstPaint , 'renderer' , ctxId , {
					activeIndex : activeIndexRef.current ,
					documentVisibility : document.visibilityState ,
					documentHidden : document.hidden ,
				} );
				perf.flush();
			} );
		} );
		const loaf = startLoafObserver( ctxId );
		const firstShow = startFirstShowMonitor( ctxId );
		firstShowMonitorRef.current = firstShow;
		return () => {
			cancelled = true;
			cancelAnimationFrame( raf1 );
			cancelAnimationFrame( raf2 );
			loaf.disconnect();
			firstShowMonitorRef.current = null;
			/* 仅首次调出 monitor 需要在提前卸载时落盘；后续 visible 周期 firstShow 为 null */
			firstShow?.stop();
		};
	} , [ visible ] );

	/* ── 隐藏时退出 rapid 模式 + 结束 profiler 采样 ── */
	useEffect( () => {
		if( !visible ) {
			if( rapidExitTimerRef.current ) {
				clearTimeout( rapidExitTimerRef.current );
				rapidExitTimerRef.current = null;
			}
			setIsRapidMode( false );
			/* 结束性能采样会话 */
			switchProfiler.endSession();
		}
	} , [ visible ] );

	/* 无 AI 时不渲染 Swiper */
	if( total === 0 ) {
		return <section
			className={ `switch-ai-bar ${ visibilityClassName }` }
			aria-hidden={ !visible }
		/>;
	}

	/* rapid 模式 CSS class：缩短卡片过渡为快速动画时长 */
	const rapidClassName = isRapidMode ? 'switch-ai-bar--rapid' : '';

	return <section
		className={ `switch-ai-bar ${ visibilityClassName } ${ rapidClassName } ${ revealFromHidden ? 'switch-ai-bar--instant' : '' }` }
		aria-hidden={ !visible }
	>
		<div className="switch-ai-bar__viewport">
			<Swiper
				key={ swiperKey }
				onSwiper={ handleSwiper }
				/* activeIndex 始终指向 displayItems 中第一份拷贝的位置 */
				initialSlide={ activeIndex }
				centeredSlides={ true }
				slidesPerView={ slidesPerView }
				spaceBetween={ ANIM.CARD_GAP }
				speed={ ANIM.SWIPER_SPEED }
				loop={ true }
				/* ═══ 关键配置 ═══
				   loopPreventsSliding: false 允许动画进行中继续调用 slideNext/slidePrev。
				   这是 Interrupt & Redirect 策略的基础——新调用覆盖旧动画目标，
				   CSS transition 自动从当前位置重定向到新目标。 */
				loopPreventsSliding={ false }
				/* clone 缓冲翻倍：减少 loopFix 边界重排频率 */
				loopAdditionalSlides={ Math.ceil( slidesPerView / 2 ) }
				allowTouchMove={ false }
				watchSlidesProgress={ true }
				navigation={ false }
				pagination={ false }
				scrollbar={ false }
				onSlideChange={ handleSlideChange }
				onTransitionEnd={ handleTransitionEnd }
			>
				{ displayItems.map( item => (
					<SwiperSlide key={ item._key }>
						{/* 卡片 = 供应商 logo + 用户 label；厂商辨识靠 logo，不再单独显示 family 文字。见 ai-vendor-logo-identity.md */}
						<div
							className="switch-ai-bar__item"
							data-ai-id={ item.id }
							data-carousel-key={ item._key }
							data-source-index={ item.sourceIndex }
							data-vendor={ item.family }
						>
							<span className="switch-ai-bar__vendor" aria-hidden="true">
								<AIVendorLogo
									family={ item.family }
									size={ 20 }
									faviconUrl={ item.faviconUrl }
									fallbackText={ vendorFallbackText( item , item.label ) }
								/>
							</span>
							<span className="switch-ai-bar__label">{ item.label }</span>
						</div>
					</SwiperSlide>
				) ) }
			</Swiper>
		</div>
	</section>;
} );

import { reaxel_FloatingView } from '#FloatingView/reaxels/floating-view';
import { getCurrentPerfCtxId } from '#FloatingView/reaxels/floating-view';
import { startLoafObserver } from '#FloatingView/utils/loaf-observer.utility';
import { startFirstShowMonitor } from '#FloatingView/utils/first-show-monitor.utility';
import { traceCarouselDom , traceCarouselOp } from '#FloatingView/utils/carousel-trace.utility';
import { AIVendorLogo } from '#shared/ai-vendor-logo';
import { vendorFallbackText } from '#shared/ai-vendor-logo/vendor-logo.utility';
import {
	buildCarouselDisplayItems ,
	detectCarouselOpFaults ,
	planCarouselFrame ,
	ringSteps ,
	type CarouselFramePlan ,
} from '#shared/carousel-op.utility';
import { perf , PerfPhase , switchProfiler } from '#shared/utils/switch-perf-recorder.utility';
import { useState , useCallback , useEffect , useRef } from 'react';
import { Swiper , SwiperSlide } from 'swiper/react';
import type { SwiperClass } from 'swiper/react';
import { reaxper } from 'reaxes-react';
import 'swiper/swiper.css';
