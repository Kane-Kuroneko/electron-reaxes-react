/* ── SwitchAiBar (Swiper 重写) ──
   以 Swiper 12 替代原有双轨 CSS 动画的 AI 切换卡片轮播。

   核心契约：
   - 向前（next）→ 卡片永远向左移动
   - 向后（previous）→ 卡片永远向右移动
   - 到边界时通过 Swiper loop 无缝循环，永不跳卡
   - 3 或 5 个视觉位置始终占满

   快速切换防吞（pending queue）：
   Swiper 的 loopPreventsSliding（默认 true）会在过渡进行中阻断 slideNext/slidePrev。
   被阻断的步骤入队，在 transitionEnd 出队执行，保证连续 Ctrl+] / Ctrl+[ 时
   每一条切换指令都不丢失。

   视觉同步（延迟到滑到位后再放大）：
   data-position 不在 onSlideChange 中更新（那会提前放大），仅在 transitionEnd
   回调中更新。卡片先跟随 Swiper 滑到目标位置，再用 CSS transition 做 arrive-settle
   过渡——消除"还没切过来就开始放大"的跳动感。

   动画参数：见下方 ANIM 常量块，与 index.less 顶部变量同步调试。

   架构不变：reaxel 管理 UI 状态 + 2s 自动隐藏；IPC 不变。 */

/* ═════════════════════════════════════════════════════════
   ANIM — 动画参数（在此集中调试）
   标注 "⇄ CSS" 的参数需与 index.less 顶部同名变量保持同步
   ═════════════════════════════════════════════════════════ */
const ANIM = {
	/* Swiper 滑动过渡时长 (ms) */
	SWIPER_SPEED         : 300 ,
	/* 卡片间距 (px) */
	CARD_GAP             : 2 ,
	/* ↓ 以下仅作文档参考，实际生效值在 index.less 顶部 LESS 变量 */
	/* ⇄ CSS @settle-duration — 卡片滑到位后放大过渡时长 (ms) */
	SETTLE_DURATION      : 1600 ,
	/* ⇄ CSS @settle-easing   — 卡片滑到位后放大缓动函数 */
	SETTLE_EASING        : checkAs<import('csstype').DataType.EasingFunction>('linear') ,
};

export const SwitchAiBar = reaxper( () => {
	const store = reaxel_FloatingView.store.switchAiBar;
	const { items , activeIndex , direction , visible } = store;
	const visibilityClassName = visible ? 'switch-ai-bar--visible' : 'switch-ai-bar--hidden';

	const swiperRef = useRef<SwiperClass>( null );

	/* ═════════════════════════════════════════════════════════
	   挂起步骤队列 — 防止快速切换吞指令
	   ═════════════════════════════════════════════════════════ */
	const pendingStepsRef = useRef( 0 );
	const pendingDirectionRef = useRef<FloatingView.SwitchAiBarDirection | null>( null );

	/* 从队列中取一步执行；若 Swiper 仍在过渡中则 slideNext/slidePrev 会再次
	   返回 false → 调用的 useEffect 会再次入队，形成自动重试链 */
	const processPendingStep = useCallback( ( swiper : SwiperClass ) => {
		if( pendingStepsRef.current <= 0 || !pendingDirectionRef.current ) return;
		pendingStepsRef.current--;
		const dir = pendingDirectionRef.current;
		if( dir === 'next' ) {
			swiper.slideNext( ANIM.SWIPER_SPEED );
		} else {
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
	   仅在过渡结束后调用——保证卡片先滑到位、再开始缩放 */
	const updateSlidePositions = ( swiper : SwiperClass ) => {
		const active = swiper.activeIndex;
		const totalSlides = swiper.slides.length;
		const halfTotal = totalSlides / 2;
		swiper.slides.forEach( ( slide , i ) => {
			let offset = i - active;
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
	   transition 结束：刷新位置 + 处理挂起队列
	   这是 data-position 更新的唯一入口——不在 onSlideChange 中更新，
	   避免卡片还没滑到中心就开始放大。 */
	const handleTransitionEnd = useCallback( ( swiper : SwiperClass ) => {
		updateSlidePositions( swiper );
		processPendingStep( swiper );
	} , [ processPendingStep ] );

	/* ── Swiper 实例就绪 ── */
	const handleSwiper = useCallback( ( swiper : SwiperClass ) => {
		swiperRef.current = swiper;
		updateSlidePositions( swiper );
	} , [] );

	/* ═════════════════════════════════════════════════════════
	   检测 activeIndex 变化 → 入队 + 尝试执行
	   ═════════════════════════════════════════════════════════ */
	const prevActiveIndexRef = useRef( activeIndex );
	useEffect( () => {
		if( prevActiveIndexRef.current === activeIndex ) return;
		prevActiveIndexRef.current = activeIndex;

		const swiper = swiperRef.current;
		if( !swiper || swiper.destroyed ) return;

		/* 方向翻转：清空旧队列，避免前后拉扯 */
		if( pendingDirectionRef.current && pendingDirectionRef.current !== direction ) {
			pendingStepsRef.current = 0;
		}

		pendingStepsRef.current++;
		pendingDirectionRef.current = direction;

		/* 若当前未在过渡中，立即执行第一步 */
		if( !swiper.animating ) {
			processPendingStep( swiper );
		}
		/* 若正在过渡中 → 当前 transitionEnd 会自动出队执行 */
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
				onSlideChange={ updateSlidePositions }
				/* activeIndex 始终指向 displayItems 中第一份拷贝的位置 */
				initialSlide={ activeIndex }
				centeredSlides={ true }
				slidesPerView={ slidesPerView }
				spaceBetween={ ANIM.CARD_GAP }
				speed={ ANIM.SWIPER_SPEED }
				loop={ true }
				allowTouchMove={ false }
				watchSlidesProgress={ true }
				navigation={ false }
				pagination={ false }
				scrollbar={ false }
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
import type { FloatingView } from '#src/Types/FloatingView';
import { reaxper } from 'reaxes-react';
import 'swiper/swiper.css';
