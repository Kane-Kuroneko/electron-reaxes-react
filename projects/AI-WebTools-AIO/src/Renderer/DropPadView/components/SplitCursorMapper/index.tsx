export const SplitCursorMapper = reaxper(({
	
}:Props) => {
	const { Core_Store , Core_Mutate } = reaxel_Core();
	const containerDragoverClass = Core_Store.dragOverPreview.containerDragOver && ' container-dragging-over' || '';
	return <div
		className = { less['split-cursor-mapper'] + containerDragoverClass }
		onDragOver={(e) => {
			// console.log(e.nativeEvent.composedPath());
			// console.log(e.target);
		}}
	>
		<div className = "layer-diagonal-direction">
			<Lattice className= { "diagonal-direction-item" + containerDragoverClass } position="leftTop"/>
			<Lattice className= { "diagonal-direction-item" + containerDragoverClass } position="rightTop"/>
			<Lattice className= { "diagonal-direction-item" + containerDragoverClass } position="leftBottom"/>
			<Lattice className= { "diagonal-direction-item" + containerDragoverClass } position="rightBottom"/>
		</div>
		
		<div className = "layer-basic-direction">
			<Lattice className= { "basic-direction-item" + containerDragoverClass } position="top"/>
			<Lattice className= { "basic-direction-item" + containerDragoverClass } position="right"/>
			<Lattice className= { "basic-direction-item" + containerDragoverClass } position="bottom"/>
			<Lattice className= { "basic-direction-item" + containerDragoverClass } position="left"/>
		</div>
		
		<Lattice className="layer-center" position="center"/>
		
	</div>;
});
type Props = {
	
}

const Lattice = reaxper(( props:{
	className: string,
	position: Position,
} ,ref) => {
	const { Core_Mutate } = reaxel_Core();
	return <div
		className={props.className + ' ' + props.position}
		onDragOver={(e) => {
			e.preventDefault();
			Core_Mutate(s => s.dragOverPreview.position = props.position)
		}}
	></div>;
});
import { reaxel_Core } from '#renderer/DropPadView/reaxels/core';
import type { Position } from '#project/src/types';
import { forwardRef , useRef } from 'react';
import * as less from './index.module.less';
