export const SporeViewContainer = reaxper(({}) => {
	const { Core_Store , Core_Mutate , onDragDropSpore } = reaxel_Core();
	
	return <div
		className = { less.sporeViewContainer }
		onDragOver = { ( event ) => {
			event.preventDefault();
			Core_Mutate(s => s.dragOverPreview.containerDragOver = true);
		} }
		onDragLeave = { () => {
			setTimeout(() => {
				Core_Mutate(s => s.dragOverPreview.containerDragOver = false);
			},20);
		} }
		onMouseLeave={() => {
			setTimeout(() => {
				Core_Mutate(s => s.dragOverPreview.containerDragOver = false);
			})
		}}
		onDrop = { ( event ) => {
			
			Core_Mutate(s => s.dragOverPreview.containerDragOver = false);
			
			const dataString = event.dataTransfer.getData('application/json');
			if(!dataString){
				console.warn(`没有dropData`);
				return;
			}
			const dragdropData: SporeDragdrop = JSON.parse(dataString);
			onDragDropSpore(dragdropData);
			console.log(`json:` , dragdropData);
		} }
	>
		{ Core_Store.layout && <SporeSplitAdjuster /> }
		{/*{ !store.dragStatus && <EmptyRegion region = { region } /> }*/ }
		{ <SplitCursorMapper /> }
		{/*<DragOverPreview />*/}
		{ Core_Store.dragOverPreview.dragOver && <SpliterPreviewBox /> }
	</div>;
});




const EmptyRegion = reaxper(( { }) => {
	const { Core_Store } = reaxel_Core();
	if( Core_Store.layout.type === 'single' && !Core_Store.dragOverPreview.containerDragOver ) {
		return <div
			className = "empty"
		>请拖拽一个spore进来</div>;
	}
	return null;
});

import type { SporeDragdrop } from '#renderer/types/spore-dragdrop';
import { SpliterPreviewBox } from '#renderer/DropPadView/components/SpliterPreviewBox';
import { SporeSplitAdjuster } from '#renderer/DropPadView/components/SporeSplitAdjuster';
import { SplitCursorMapper } from '#renderer/DropPadView/components/SplitCursorMapper';
import * as less from './index.module.less';
import { reaxel_Core ,} from '#renderer/DropPadView/reaxels/core';
