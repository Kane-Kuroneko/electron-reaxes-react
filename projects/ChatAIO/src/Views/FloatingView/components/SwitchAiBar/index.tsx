/* ── SwitchAiBar (Swiper 重写) ──
   以 Swiper 12 替代原有双轨 CSS 动画的 AI 切换卡片轮播。

   核心契约：
   - 向前（next）→ 卡片永远向左移动
   - 向后（previous）→ 卡片永远向右移动
   - 到边界时通过 Swiper loop 无缝循环，永不跳卡
   - 3 或 5 个视觉位置始终占满

   快速切换防吞（pending queue）：
   Swiper 的 loopPreventsSliding（默认 true）会在过渡进行中阻断 slideNext/slidePrev。
   被阻断的步骤入队，在 onTransitionEnd handler 出队执行，保证连续 Ctrl+] / Ctrl+[ 时
   每一条切换指令都不丢失。

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
	/* Swiper 滑动过渡时长 (ms) */
	SWIPER_SPEED         : 300 ,
	/* 卡片间距 (px) */
	CARD_GAP             : 2 ,
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
	   挂起步骤队列 — 防止快速切换吞指令
	   ═════════════════════════════════════════════════════════ */
	const pendingStepsRef = useRef( 0 );
	const pendingDirectionRef = useRef<FloatingView.SwitchAiBarDirection | null>( null );

	/* 从队列中取一步执行；若 Swiper 仍在过渡中则 slideNext/slidePrev 会再次
	   返回 false → 会由 onTransitionEnd handler 再次入队，形成自动重试链。
	   注：Swiper 在 animating 状态且 loopPreventsSliding=true 时，
	   slideNext/slidePrev 调用本身不会抛出——但实际滑动会被 Swiper 内部拦截；
	   此时下一帧的 transitionEnd 会再次触发 processPendingStep 继续消费。 */
	const processPendingStep = useCallback( ( swiper : SwiperClass ) => {
		if( pendingStepsRef.current <= 0 || !pendingDirectionRef.current ) return;
		pendingStepsRef.current--;
		const dir = pendingDirectionRef.current;
		if( dir === 'next' ) {
			perf.mark( 'switch:swiper-begin' , 'renderer' , getCurrentPerfCtxId() , {
				direction : 'next' ,
				remainingSteps : pendingStepsRef.current,
			} );
			swiper.slideNext( ANIM.SWIPER_SPEED );
		} else {
			perf.mark( 'switch:swiper-begin' , 'renderer' , getCurrentPerfCtxId() , {
				direction : 'previous' ,
				remainingSteps : pendingStepsRef.current,
			} );
			swiper.slidePrev( ANIM.SWIPER_SPEED );
		}
	} , [] );

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
	   Swiper 内部会同步修正 activeIndex，始终指向居中的活跃卡片。
	   注意：不能用 swiper-slide-active class 反查——loop 下所有 clone
	   都有该 class，findIndex 会取到边缘 clone 而非居中那张。 */
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
   transition 结束：处理挂起队列 */
const handleTransitionEnd = useCallback( ( swiper : SwiperClass ) => {
	perf.mark( 'switch:swiper-end' , 'renderer' , getCurrentPerfCtxId() , {
		pendingRemaining : pendingStepsRef.current,
	} );
	processPendingStep( swiper );
	if( pendingStepsRef.current <= 0 ) {
		perf.mark( 'switch:complete' , 'renderer' , getCurrentPerfCtxId() , {
			activeIndex : activeIndexRef.current,
		} );
	}
} , [ processPendingStep ] );

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
	   检测 activeIndex 变化 → 入队 + 尝试执行
	   ═════════════════════════════════════════════════════════ */
	const prevActiveIndexRef = useRef( activeIndex );
	useEffect( () => {
		if( prevActiveIndexRef.current === activeIndex ) return;
		const prevIndex = prevActiveIndexRef.current;
		prevActiveIndexRef.current = activeIndex;

		perf.mark( 'switch:active-index-changed' , 'renderer' , getCurrentPerfCtxId() , {
			prevIndex ,
			activeIndex ,
			direction ,
			stepCount : direction === 'next'
				? ( activeIndex - prevIndex + items.length ) % items.length
				: ( prevIndex - activeIndex + items.length ) % items.length,
		} );

		const swiper = swiperRef.current;
		if( !swiper || swiper.destroyed ) return;

		/* 方向翻转：清空旧队列，避免前后拉扯 */
		if( pendingDirectionRef.current && pendingDirectionRef.current !== direction ) {
			pendingStepsRef.current = 0;
		}

		/* 基于实际索引差计算步数（带 wrap-around），而非总是 +1。
		   MobX 同步更新 + React effect 异步执行时 activeIndex 可能跨越多位置，
		   仅 +1 会导致 Swiper 滞后于 store 的真实 activeIndex，引起卡片显示错位。 */
		const total = items.length;
		let steps: number;
		if( direction === 'next' ) {
			steps = ( activeIndex - prevIndex + total ) % total;
		} else {
			steps = ( prevIndex - activeIndex + total ) % total;
		}
		/* 同方向绕回一整圈：delta % total === 0 但索引确实发生了变化 */
		if( steps === 0 && activeIndex !== prevIndex ) {
			steps = total;
		}

		pendingStepsRef.current += steps;
		pendingDirectionRef.current = direction;

		/* 若当前未在过渡中，立即执行第一步 */
		if( !swiper.animating ) {
			processPendingStep( swiper );
		}
		/* 若正在过渡中 → onTransitionEnd handler 会依次出队执行 */
	} , [ activeIndex , direction ] );

	/* ── 隐藏时清空挂起队列 ── */
	useEffect( () => {
		if( !visible ) {
			pendingStepsRef.current = 0;
			pendingDirectionRef.current = null;
		}
	} , [ visible ] );

	/* 无 AI 时不渲染 Swiper */
	if( total === 0 ) {
		return <section
			className={ `switch-ai-bar ${ visibilityClassName }` }
			aria-hidden={ !visible }
		/>;
	}

	return <section
		className={ `switch-ai-bar ${ visibilityClassName }` }
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
				/* Swiper 默认 centeredSlides 下 loopedSlides = ceil(slidesPerView/2)。
				   追加等量 loopAdditionalSlides → clone 缓冲翻倍，
				   减少 loopFix 边界重排频率，防止 DOM 位置突变导致 data-position 错位。 */
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

import { Swiper , SwiperSlide } from 'swiper/react';
import type { SwiperClass } from 'swiper/react';
import { reaxel_FloatingView } from '../../reaxels/floating-view';
import { getCurrentPerfCtxId } from '../../reaxels/floating-view';
import type { FloatingView } from '#src/Types/FloatingView';
import { reaxper } from 'reaxes-react';
import { perf } from '#src/shared/utils/switch-perf-recorder.utility';
import 'swiper/swiper.css';
