/**
 * dnd-kit 把 sortable 拖到更小下标时，松手后会在新落点再派发一发 click
 * （https://github.com/clauderic/dnd-kit/issues/172）。
 * Switch AI / Current AI 下拉的 click = switch-ai → showAIView，会把已关闭的页重新实例化成 WCV。
 * 只拦 switch-ai 的 handleClick，不要在 window capture 里 stopPropagation：
 * 会误伤随后 Application → Settings 等其它菜单项。
 * 契约：docs/features/ai-list-reorder.md
 */

let armed = false;
let timer : ReturnType<typeof setTimeout> | null = null;

const GHOST_CLICK_WINDOW_MS = 250;

export const armGhostClickAfterSort = () => {
	armed = true;
	if( timer ) {
		clearTimeout( timer );
	}
	timer = setTimeout( () => {
		armed = false;
		timer = null;
	} , GHOST_CLICK_WINDOW_MS );
};

export const disarmGhostClickAfterSort = () => {
	armed = false;
	if( timer ) {
		clearTimeout( timer );
		timer = null;
	}
};

export const isGhostClickAfterSort = () => armed;
