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

   方向保证：
   始终使用 slideNext() / slidePrev() 而非 slideToLoop()，
   这两个方法在 loop 模式下永远沿指定方向滑动，到边界通过 clone 无缝循环。

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
	/* activeIndexRef 始终跟随最新 activeIndex —— 供 handleSwiper 等稳定回调中读取 */
	const activeIndexRef = useRef( activeIndex );
	activeIndexRef.current = activeIndex;

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
	const slidesPerView = total >= 4 ? 5 : total === 1 ? 1 : 3;

	/* ═════════════════════════════════════════════════════════
	   补齐 loop + centeredSlides 的最小 slide 数
	   ═════════════════════════════════════════════════════════ */
	const minSlidesForLoop = slidesPerView + Math.ceil( slidesPerView / 2 ) * 2;
	let displayItems : (FloatingView.SwitchAiBarItem & { _key : string })[] = [];
	if( total > 0 ) {
		const repeatTimes = Math.max( 1 , Math.ceil( minSlidesForLoop / total ) );
		for( let r = 0 ; r < repeatTimes ; r++ ) {
			for( let i = 0 ; i < total ; i++ ) {
				displayItems.push( {
					...items[i] ,
					_key : `${ items[i].id }--dup${ r }`,
				} );
			}
		}
	}

	/* key 随 total 变化递增，强制 Swiper 重建（AI 增删时） */
	const swiperKeyRef = useRef( 0 );
	const prevTotalRef = useRef( total );
	if( prevTotalRef.current !== total ) {
		prevTotalRef.current = total;
		swiperKeyRef.current++;
	}
	const swiperKey = swiperKeyRef.current;

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
	   transition 结束：记录性能标记 */
	const handleTransitionEnd = useCallback( ( swiper : SwiperClass ) => {
		perf.mark( 'switch:swiper-end' , 'renderer' , getCurrentPerfCtxId() , {
			realIndex : swiper.realIndex,
		} );
		perf.mark( 'switch:complete' , 'renderer' , getCurrentPerfCtxId() , {
			activeIndex : activeIndexRef.current,
		} );
	} , [] );

	/* ── Swiper 实例就绪 ──
	   同步 prevActiveIndexRef 到当前 activeIndex，避免 useEffect
	   误把 initialSlide 定位当作「activeIndex 变化」而追加额外 slide。 */
	const handleSwiper = useCallback( ( swiper : SwiperClass ) => {
		swiperRef.current = swiper;
		prevActiveIndexRef.current = activeIndexRef.current;
		updateSlidePositions( swiper );
		perf.mark( 'switch:render-done' , 'renderer' , getCurrentPerfCtxId() , {
			totalSlides : swiper.slides.length,
		} );
	} , [] );

	/* ═════════════════════════════════════════════════════════
	   检测 activeIndex 变化 → 执行 slideNext/slidePrev
	   Interrupt & Redirect：每次切换直接执行，CSS transition 自动中断重定向
	   ═════════════════════════════════════════════════════════ */
	const prevActiveIndexRef = useRef( activeIndex );
	useEffect( () => {
		if( prevActiveIndexRef.current === activeIndex ) return;
		const prevIndex = prevActiveIndexRef.current;
		prevActiveIndexRef.current = activeIndex;

		const now = performance.now();
		const elapsed = now - lastSwitchTimeRef.current;
		lastSwitchTimeRef.current = now;

		/* 启动性能采样会话（首次切换时触发） */
		if( !switchProfiler.isActive ) {
			switchProfiler.startSession();
		}

		/* 判定是否为快速切换 */
		const isRapid = elapsed <= ANIM.RAPID_THRESHOLD && elapsed > 0;
		/* 选择动画速度：快速模式 120ms，普通模式 300ms */
		const speed = isRapid ? ANIM.RAPID_SPEED : ANIM.SWIPER_SPEED;

		/* 基于实际索引差计算步数（带 wrap-around） */
		let steps : number;
		if( direction === 'next' ) {
			steps = ( activeIndex - prevIndex + total ) % total;
		} else {
			steps = ( prevIndex - activeIndex + total ) % total;
		}
		/* 同方向绕回一整圈：delta % total === 0 但索引确实发生了变化 */
		if( steps === 0 && activeIndex !== prevIndex ) {
			steps = total;
		}

		perf.mark( 'switch:active-index-changed' , 'renderer' , getCurrentPerfCtxId() , {
			prevIndex ,
			activeIndex ,
			direction ,
			isRapid ,
			speed ,
			elapsed : Math.round( elapsed ),
			steps ,
		} );

		const swiper = swiperRef.current;
		if( !swiper || swiper.destroyed ) return;

		/* ═══ 统一执行：slideNext/slidePrev 保证方向 ═══
		   loopPreventsSliding: false 允许动画中继续调用。
		   CSS transition 天然中断重定向：新调用设置新 translate，
		   浏览器从当前视觉位置开始向新目标动画——无排队、无丢帧。 */
		for( let i = 0 ; i < steps ; i++ ) {
			if( direction === 'next' ) {
				swiper.slideNext( speed );
			} else {
				swiper.slidePrev( speed );
			}
		}

		/* rapid 模式 CSS class 管理 */
		if( isRapid ) {
			if( !isRapidMode ) {
				setIsRapidMode( true );
			}
			/* 重置退出定时器：最后一次快速切换后等待退出 */
			if( rapidExitTimerRef.current ) {
				clearTimeout( rapidExitTimerRef.current );
			}
			rapidExitTimerRef.current = setTimeout( () => {
				setIsRapidMode( false );
				rapidExitTimerRef.current = null;
			} , ANIM.SWIPER_SPEED );

			/* profiler 统计 */
			switchProfiler.recordRapidJump();
		} else {
			/* 退出 rapid 模式 */
			if( isRapidMode ) {
				setIsRapidMode( false );
				if( rapidExitTimerRef.current ) {
					clearTimeout( rapidExitTimerRef.current );
					rapidExitTimerRef.current = null;
				}
			}
		}

		perf.mark( 'switch:swiper-begin' , 'renderer' , getCurrentPerfCtxId() , {
			direction ,
			speed ,
			steps ,
			isRapid ,
		} );
	} , [ activeIndex , direction ] );

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
		className={ `switch-ai-bar ${ visibilityClassName } ${ rapidClassName }` }
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
						<div className="switch-ai-bar__item">
							<span className="switch-ai-bar__label">{ item.label }</span>
							<span className="switch-ai-bar__family">{ item.family }</span>
						</div>
					</SwiperSlide>
				) ) }
			</Swiper>
		</div>
	</section>;
} );

import { reaxel_FloatingView } from '../../reaxels/floating-view';
import { getCurrentPerfCtxId } from '../../reaxels/floating-view';
import type { FloatingView } from '#src/Types/FloatingView';
import { perf , switchProfiler } from '#src/shared/utils/switch-perf-recorder.utility';
import { useState , useCallback , useEffect , useRef } from 'react';
import { Swiper , SwiperSlide } from 'swiper/react';
import type { SwiperClass } from 'swiper/react';
import { reaxper } from 'reaxes-react';
import 'swiper/swiper.css';
