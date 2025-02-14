export const SpliterPreviewBox = reaxper(() => {
	const { Core_Store , Core_Mutate } = reaxel_Core();
	return <div
		className = "drag-over-preview-container"
	>
		<div
			onDragOver = { () => {
				Core_Mutate(s => s.dragOverPreview.previewDragOver = true);
			} }
			onDragLeave = { () => {
				Core_Mutate(s => s.dragOverPreview.previewDragOver = false);
			} }
			onDrop = { () => {
				Core_Mutate(s => s.dragOverPreview.previewDragOver = false);
			} }
			className = { `preview-box ${ Core_Store.dragOverPreview.position || '' }` }
		>
		</div>
	</div>;
});

import { reaxel_Core  } from '#renderer/DropPadView/reaxels/core';
