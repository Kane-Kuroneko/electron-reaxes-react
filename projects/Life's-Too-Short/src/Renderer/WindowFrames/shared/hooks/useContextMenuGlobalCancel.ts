type UseContextMenuGlobalCancelOptions = {
	/**
	 * 当点击发生在全局且不在目标元素内时触发的关闭函数。
	 * 典型场景：关闭右键菜单或下拉框。
	 */
	close: () => void;
	
	/**
	 * 触发关闭动作的延时（毫秒）。
	 * 默认值为 10ms，用于避免和当前点击逻辑冲突。
	 */
	delay?: number;
};

/**
 * React Hook: useContextMenuGlobalCancel
 *
 * 用于实现全局点击时自动关闭当前右键菜单（或任意浮层）。
 *
 * 工作机制：
 * - 提供一个 ref，用于绑定到右键菜单根元素。
 * - 监听全局 `mousedown` 事件。
 * - 如果点击发生在 ref 元素外部，则延迟触发 `close()`。
 *
 * @template T HTML 元素类型
 * @param {UseContextMenuGlobalCancelOptions} options 配置参数
 * @returns {React.RefObject<T>} 返回一个 ref，需绑定到菜单根节点
 *
 * @example
 * ```tsx
 * export default function ContextMenuExample() {
 *    const [open, setOpen] = React.useState(false);
 *
 *    // 使用 hook，传入关闭逻辑
 *    const ref = useContextMenuGlobalCancel<HTMLDivElement>({
 *       close: () => setOpen(false),
 *       delay: 20, // 可选，默认10ms
 *    });
 *
 *    return (
 *       <div>
 *          <button onClick={() => setOpen(true)}>打开菜单</button>
 *          {open && (
 *             <div ref={ref}>
 *                <div>菜单项 1</div>
 *                <div>菜单项 2</div>
 *             </div>
 *          )}
 *       </div>
 *    );
 * }
 * ```
 */
export function useContextMenuGlobalCancel<T extends HTMLElement>({
	close,
	delay = 10,
}: UseContextMenuGlobalCancelOptions) {
	const ref = useRef<T | null>(null);
	
	useEffect(() => {
		const handleGlobalClick = (e: MouseEvent) => {
			if (
				ref.current &&
				(e.composedPath() as Node[]).includes(ref.current)
			) {
				return;
			}
			setTimeout(() => {
				close();
			}, delay);
		};
		document.addEventListener("mousedown", handleGlobalClick, true);
		return () => {
			document.removeEventListener("mousedown", handleGlobalClick, true);
		};
	}, [close, delay]);
	
	return ref;
}
