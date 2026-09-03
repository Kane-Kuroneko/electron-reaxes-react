/**
 * dnd-kit 默认 MouseSensor 在 button === 2 时拒绝激活。
 * Switch AI 左键要切页，排序只能走右键，因此覆盖 activator。
 *
 * 右键按下须立刻换成拖拽光标，不要等 activationConstraint.distance（8px）触发 onDragStart。
 * Windows/Chromium 在按键按住期间会忽略“之后”的 cursor 变更，直到 mousemove，
 * 所以必须在 mousedown 同步处理里改 html/body，不能等 React setState。
 * 契约：docs/features/ai-list-reorder.md
 */
export class RightClickMouseSensor extends MouseSensor {
	static activators = [
		{
			eventName : 'onMouseDown' as const ,
			handler : (
				{ nativeEvent : event } : MouseEvent ,
				{ onActivation } : MouseSensorOptions ,
			) => {
				if( event.button !== 2 ) {
					return false;
				}
				armReorderCursor( event.target );
				onActivation?.( { event } );
				return true;
			} ,
		} ,
	];
}

const DROPDOWN_DRAG_CURSOR_CLASS = 'dropdown-drag-cursor';

let releaseReorderCursor : ( ( e? : Event ) => void ) | null = null;

/**
 * @description 右键按下时同步武装 grabbing 光标，松手 / 取消时还原。
 */
const armReorderCursor = ( target : EventTarget | null ) => {
	releaseReorderCursor?.();

	const html = document.documentElement;
	const body = document.body;
	const hit = target instanceof HTMLElement ? target : null;

	html.classList.add( DROPDOWN_DRAG_CURSOR_CLASS );
	html.style.cursor = 'grabbing';
	body.style.cursor = 'grabbing';
	hit?.style.setProperty( 'cursor' , 'grabbing' , 'important' );

	const isRightRelease = ( e : Event ) => {
		if( e.type === 'blur' || e.type === 'pointercancel' ) {
			return true;
		}
		return 'button' in e && ( e as MouseEvent ).button === 2;
	};

	const teardown = ( e? : Event ) => {
		if( releaseReorderCursor !== teardown ) {
			return;
		}
		if( e && !isRightRelease( e ) ) {
			return;
		}
		releaseReorderCursor = null;
		html.classList.remove( DROPDOWN_DRAG_CURSOR_CLASS );
		html.style.cursor = '';
		body.style.cursor = '';
		hit?.style.removeProperty( 'cursor' );
		window.removeEventListener( 'mouseup' , teardown , true );
		window.removeEventListener( 'pointerup' , teardown , true );
		window.removeEventListener( 'pointercancel' , teardown , true );
		window.removeEventListener( 'blur' , teardown );
	};

	releaseReorderCursor = teardown;
	window.addEventListener( 'mouseup' , teardown , true );
	window.addEventListener( 'pointerup' , teardown , true );
	window.addEventListener( 'pointercancel' , teardown , true );
	window.addEventListener( 'blur' , teardown );
};


import type { MouseEvent } from 'react';
import {
	MouseSensor ,
	type MouseSensorOptions ,
} from '@dnd-kit/core';
