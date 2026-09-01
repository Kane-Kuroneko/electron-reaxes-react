# Menubar Current AI 下拉切换

中区 `CurrentContextBadge` 左键打开与 Switch AI **同一套 DropdownView**，但只含 AI 列表（可右键拖排序），不含 Prev/Next Opened / Prev/Next Page。右键在 badge 上被吞掉，避免 Windows 拖区弹出系统窗口菜单。

## 不变量

1. **条目来源**：从 `switch-ai` submenu 过滤 `action === 'switch-ai'`（无 enabled AI 时保留 `no-ai` 占位）。不在主进程 `createMenuData()` 再造一份顶级菜单。
2. **虚拟菜单 id**：`current-ai`。不进入左区 `structure` / `partitionStructure`，因此 Alt/F10 键盘循环不会扫到它。
3. **只响应左键点击**。左区 Application / View / Switch AI 已展开时，鼠标移到 badge **不会**切到这张精简菜单。左区自己的 hover 切换不变。
4. **badge 为 `no-drag`**。点得着就必须挖洞；Prev/Next 两侧空白、`drag-tail`、macOS spacer 仍可拖窗。禁止为排序去改 menubar drag（排序只在 DropdownView，见 [ai-list-reorder.md](./ai-list-reorder.md)）。
5. **badge 右键一律 `preventDefault`**。下拉里的右键仍走 Switch AI 的拖排序 sensor。
6. **Settings 打开时 badge 零交互**：只展示「Settings」。无下拉、无 hover、无 pointer、无拖窗；右键仍 `preventDefault`。若进入 Settings 时 `current-ai` 下拉还开着，立刻关掉。
7. **下拉 AI name 与 badge 文字左对齐**（`anchorAlign: 'label'`）：
   - badge 文字左缘用 `.main-view-context-badge__label` 的 `getBoundingClientRect()`（随文案长短变）。
   - 面板左移量 = `getSwitchAiLabelInset()`，与 DropdownView CSS 变量同一数据源（`shared/dropdown-geometry.ts`）。禁止在 Main-View 或 less 里再写一套 12/16/8。
   - 左区菜单仍贴按钮左缘。超出窗口左右则夹紧（此时允许不对齐，优先不画出窗外）。

## 数据流

```mermaid
flowchart TD
  click["左键 CurrentContextBadge"]
  toggle["pressTopMenuItem('current-ai')"]
  filter["getCurrentAiMenuItems(structure)"]
  open["openDropdownView(anchor=badge rect)"]
  dnd["DropdownView：左键切 AI / 右键拖排序"]

  click --> toggle --> filter --> open --> dnd
```

## 关键文件

| 路径 | 职责 |
|------|------|
| [`src/Views/MainView/components/CurrentContextBadge/index.tsx`](../../src/Views/MainView/components/CurrentContextBadge/index.tsx) | 左键 / 吞右键 / `data-menu-id="current-ai"` |
| [`src/Views/MainView/reaxels/main-view/current-ai-menu.utility.ts`](../../src/Views/MainView/reaxels/main-view/current-ai-menu.utility.ts) | 虚拟 id 与 submenu 过滤 |
| [`src/shared/dropdown-geometry.ts`](../../src/shared/dropdown-geometry.ts) | 下拉几何 / `getSwitchAiLabelInset` / CSS 变量 |
| [`src/Views/MainView/reaxels/main-view/index.ts`](../../src/Views/MainView/reaxels/main-view/index.ts) | `getSubmenuForMenu` / 开合 Dropdown / `anchorAlign` |
| [`src/Main/reaxels/Views/Main-View/index.ts`](../../src/Main/reaxels/Views/Main-View/index.ts) | `resolveDropdownContentX` 定位 |
| [`src/Views/DropdownView/App.tsx`](../../src/Views/DropdownView/App.tsx) | 复用；无 footer 时只渲染 AI 列表 |

## 禁止项

- 不要给 badge 加左区那种 hover 切换（`hoverTopMenuItem`）。
- 不要把 Prev/Next Opened / Page 塞进这张下拉。
- 不要把 badge 改回 `-webkit-app-region: drag`（右键会再呼出原生窗口菜单，左键也点不着）。
- 不要为「点得着」去砍整栏 menubar drag，见 [`menubar-drag-region-leak-below-content.md`](../issues/menubar-drag-region-leak-below-content.md)。
- 不要在 Settings 打开时让 badge 开下拉或看起来可点。
- 不要把左区 Switch AI / Application 下拉改成跟 badge 文字对齐；`anchorAlign: 'label'` 只给 `current-ai`。
- 不要在 `DropdownView/index.less` 或 `Main-View/index.ts` 里硬编码 checkmark/gap/load-dot 来「调对齐」；只改 `dropdown-geometry.ts`。

## 与现有文档

- 平台布局仍以 [`menubar-platform-paths.md`](../architecture/menubar-platform-paths.md) 为准；本文只覆盖中区 badge 的点击契约。
- 排序契约不另起一套，沿用 [ai-list-reorder.md](./ai-list-reorder.md)。
