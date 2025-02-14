export const SplitCursorMapper = reaxper(({
	
}:Props) => {
	const { Core_Store , Core_Mutate } = reaxel_Core();
	
	return <div
		className = { less['split-cursor-mapper'] }
		onDragOver={(e) => {
			Core_Mutate(s => s.dragOverPreview.mapperDragOver = true);
			// console.log(e.nativeEvent.composedPath());
			// console.log(e.target);
		}}
	>
		<div className = "layer-diagonal-direction">
			<Lattice className="diagonal-direction-item" position="leftTop"/>
			<Lattice className="diagonal-direction-item" position="rightTop"/>
			<Lattice className="diagonal-direction-item" position="leftBottom"/>
			<Lattice className="diagonal-direction-item" position="rightBottom"/>
		</div>
		
		<div className = "layer-basic-direction">
			<Lattice className="basic-direction-item" position="top"/>
			<Lattice className="basic-direction-item" position="right"/>
			<Lattice className="basic-direction-item" position="bottom"/>
			<Lattice className="basic-direction-item" position="left"/>
		</div>
		
		<Lattice className="layer-center" position="center"/>
		
	</div>;
});
type Props = {
	
}

let prevPosition = null;
const Lattice = reaxper(( props:{
	className: string,
	position: Position,
} ,ref) => {
	const { Core_Mutate , Core_Store } = reaxel_Core();
	const containerDragoverClass = Core_Store.dragOverPreview.dragOver && ' container-dragging-over' || '';
	return <div
		className = { props.className + ' ' + props.position + containerDragoverClass }
		onDragOver = { ( e ) => {
			// e.preventDefault();
			Core_Mutate(s => {
				s.dragOverPreview.position = props.position;
				s.dragOverPreview.mapperDragOver = true;
			});
			prevPosition = props.position;
		} }
		onMouseLeave={() => {
			setTimeout(() => {
				Core_Mutate(s => {
					s.dragOverPreview.mapperDragOver = false;
				});
			});
		}}
		onDragLeave = { () => {
			Core_Mutate(s => {
				s.dragOverPreview.mapperDragOver = false;
			});
			setTimeout(() => {
				if(Core_Store.dragOverPreview.position && Core_Store.dragOverPreview.position !== prevPosition){
					Core_Mutate(s => s.dragOverPreview.position = null);
					return;
				}else {
					return;
				}
			} , 50);
		} }
		onDrop = { () => {
			setTimeout(() => {
				Core_Mutate(s => {
					s.dragOverPreview.position = null;
					s.dragOverPreview.mapperDragOver = false;
				});
			});
		} }
	></div>;
});
import { reaxel_Core } from '#renderer/DropPadView/reaxels/core';
import type { Position } from '#project/src/types';
import { forwardRef , useRef } from 'react';
import * as less from './index.module.less';
