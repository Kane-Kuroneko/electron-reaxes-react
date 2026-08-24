/**
 * dnd-kit 默认 MouseSensor 在 button === 2 时拒绝激活。
 * Switch AI 左键要切页，排序只能走右键，因此覆盖 activator。
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
				onActivation?.( { event } );
				return true;
			} ,
		} ,
	];
}


import type { MouseEvent } from 'react';
import {
	MouseSensor ,
	type MouseSensorOptions ,
} from '@dnd-kit/core';
