/**
 * Radix FocusScope 打开时会 autofocus 第一个可聚焦子节点。
 * 那个节点若是 Tooltip / 另一个 Popover 的 trigger，浮层会被当成「用户聚焦」打开。
 *
 * 社区做法（radix discussions/935、shadcn-ui/ui#2307）：preventDefault，把焦点落到
 * 容器本身（Content 已有 tabIndex=-1）。键盘仍可 Tab 进控件。
 * 不要把这段写进业务 Dialog。Select / DropdownMenu 仍走默认（要亮当前项）。
 * 设计：docs/features/settings-ui-shadcn.md
 */
export const focusOverlaySurface = ( event:Event ) => {
	if( event.defaultPrevented ) return;
	event.preventDefault();
	const target = event.currentTarget;
	if( target instanceof HTMLElement ) {
		target.focus( { preventScroll : true } );
	}
};
