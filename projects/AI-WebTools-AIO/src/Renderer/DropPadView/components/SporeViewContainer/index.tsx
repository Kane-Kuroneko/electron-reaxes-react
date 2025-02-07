export const SporeViewContainer = reaxper(({}) => {
	const { Core_Store , Core_Mutate } = reaxel_Core();
	
	return <div
		className = { less.sporeViewContainer }
		onDragOver = { ( event ) => {
			event.preventDefault();
			Core_Mutate(s => s.dragOverPreview.containerDragOver = true);
		} }
		onDragLeave = { () => {
			Core_Mutate(s => s.dragOverPreview.containerDragOver = false);
		} }
		onDrop = { ( event ) => {
			Core_Mutate(s => s.dragOverPreview.containerDragOver = false);
			
			const dataString = event.dataTransfer.getData('application/json');
			if(!dataString){
				console.warn(`没有dropData`);
				return;
			}
			const json = JSON.parse(dataString);
			console.log(`json:` , json);
		} }
	>
		<SporeSplitAdjuster/>
		{/*{ !store.dragStatus && <EmptyRegion region = { region } /> }*/ }
		{ <SplitCursorMapper /> }
		{/*<DragOverPreview />*/}
		{ Core_Store.dragOverPreview.dragOver && <DragOverPreview /> }
	</div>;
});

const DragOverPreview = reaxper(() => {
	const { Core_Store , Core_Mutate } = reaxel_Core();
	return <div
		className="drag-over-preview-container"
		onDragOver={() => {
			Core_Mutate(s => s.dragOverPreview.previewDragOver = true)
		}}
		onDragLeave={() => {
			Core_Mutate(s => s.dragOverPreview.previewDragOver = false);
		}}
	>
		<div
			className = { `preview-box ${ Core_Store.dragOverPreview.position }` }
		>
		</div>
	</div>
})


const EmptyRegion = reaxper(( { }) => {
	const { Core_Store } = reaxel_Core();
	if( Core_Store.layout.type === 'single' && !Core_Store.dragOverPreview.containerDragOver ) {
		return <div
			className = "empty"
		>请拖拽一个spore进来</div>;
	}
	return null;
});

import { SporeSplitAdjuster } from '#renderer/DropPadView/components/SporeSplitAdjuster';
import { SplitCursorMapper } from '#renderer/DropPadView/components/SplitCursorMapper';
import * as less from './index.module.less';
import { reaxel_Core ,} from '#renderer/DropPadView/reaxels/core';
