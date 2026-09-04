# Manage AIs 表格展示序与列筛选

Settings → Manage AIs 的表只是**观察窗**：未启用行沉底、列筛选、拖启用项，都不把「看见的顺序」当成 `user-ais.json` 里 `ais` 的顺序。

Enabled 列是 `Switch`，Preload on Startup 列是 `Checkbox`（控件对调，列顺序不变）。置底按上次表底 Save / 弹窗 persist 的 `disabled`，编辑 Enabled 时行不跳，明确保存后才分区。

写盘顺序仍是持久化 `AIs` 数组下标。Switch AI 菜单 / 热键跟那条数组走，不跟表内展示序走。排序 IPC 见 [`ai-list-reorder.md`](./ai-list-reorder.md)。改前跑 `yarn test`（见 [`scripts.md`](../../scripts.md)）。

## 不变量

1. **展示序 ≠ 持久化序**。表里启用在上、未启用置底；两边各自保持真实数组中的相对序。
2. **未启用项钉在真实数组原下标**。拖启用项只重排启用槽，把新的启用序列填回原来的启用下标。禁止 drop 时对整表 `arrayMove`（会把未启用项挤走）。
3. **未启用行禁拖、也不能当投放目标**。不能把启用项拖进未启用区。分区与禁拖都看**上次表底 Save / 弹窗 persist** 的 `disabled`，不是当前未保存的 toggle。
4. **启用/禁用只翻转 `disabled`**，不改下标。行**不要**立刻跳到对应视觉分区；等用户点表底 Save（`updateAIsSnapshotFromStore` 刷新 committed disabled）后再置底。弹窗即时保存的新行已在快照里。
5. **Enabled 列用 `Switch`，Preload on Startup 列用 `Checkbox`**。列顺序仍是 Enabled 在左、Preload 在右；不要把 Enabled 改回 Checkbox。
6. **列筛选只改 `dataSource`**，不写盘、不改 `AIs` 顺序。多列 AND。筛选 open/value 在 `reaxel_SettingsView.store.UIControls.manage_AIs.column_filter`，与 `pendingDeleteAIIds` 一样是 UI-only：**不 persist、不计 dirty**。
7. **筛选面板**点开后不因空白处 / clickOutside / 失焦关闭；多列可同时开。关掉某一列并清空该列条件，不影响其它列。
8. **空表不能拆掉筛选 Input**。`dataSource=[]` 时 Table 仍挂着（`locale.emptyText` / placeholder 行）；真正的 Input 不进 antd `filterDropdown`，而走 `document.body` portal。

## 拖拽映射

数据 `[A开, B关, C开, D关, E开]` → 展示 `[A, C, E, B, D]`。把 E 拖到 A 前 → 数据 `[E开, B关, A开, D关, C开]`。

启用槽原是下标 `0,2,4`（A,C,E），新启用序 `[E,A,C]` 填回去；B、D 不动。

列筛选藏住的启用项在启用序列里同样钉住，不会被这次拖拽挤走。

拖的过程中：未启用行已经在展示区底部，且不是 droppable，中间不会插进未启用项。不要用「拖的时候先挤位、松手再弹回分区」当默认实现。

## 筛选面板

- 只要一条 input：输入即筛。高度走 antd 默认 `controlHeight` **32px**。面板 padding **4px**（compact popover；不靠加大 padding 给关闭 x 让路）。
- input 尾 x：清空该列条件，面板保持打开。
- 面板关闭 x：相对最外层 `.settings-column-text-filter` 定位，按钮中心对齐该盒子 border-box 的 top-right（`translate(50%, -50%)`）。可与 input 右上角轻微重叠。关面板并且清空该列。
- 不要 Search / Reset 按钮。
- 不要用 antd 默认「点外面就关 / 同时只开一列」。表头漏斗只负责 `openManageAIsColumnFilter`；`filterDropdownProps.open` 永远 `false`，antd 自己的 overlay 不挂 Input。
- 浮层与该列 filter icon **右对齐**：portal 面板 `position:fixed` 的 CSS `right` = `clientWidth − icon.getBoundingClientRect().right`（浮层右缘贴齐图标右缘，向左长）。不要 `left = icon.right − 160`。打开、resize、表头/表体滚动都跟 icon。

### 为何筛选态必须进 reaxel

`reaxper` 组件直接读 `reaxel_*.store`，输入只 `setState`。不要用父级 `useState` + React Context 把 value 灌进 Table：那会逼整张表跟着筛选项重渲，也违反 Reaxes（业务态在 reaxel，组件是观察者）。

`ColumnTextFilterPanel` / `ColumnTextFilterIcon` 是 `reaxper`，各自读 `column_filter.value` / `open`。`columns` 不吃筛选 value，也不吃 open。

### 为何空表要把浮层从单元格上拆下来

antd Table `dataSource=[]` 时：

1. `InternalTable` 给表加上 `ant-table-empty`。
2. `rc-table` `Body`（`node_modules/rc-table/es/Body/index.js`）`data.length === 0` 时丢掉所有 `BodyRow`，改挂 `ExpandedRow` placeholder。
3. `FixedHolder` 收到 `noData: true`，`isColGroupEmpty` 变 true，表头 `ColGroup` 从算宽切回原始 colgroup。
4. `injectFilter` 把 `FilterDropdown` 写在列 `title` 里。表头 / 单元格一重建，antd `filterDropdown` 里的 Input 就 unmount（失焦、IME 组字失败）。空结果时尤其明显。

所以 Input 由 `ManageAIsColumnFilterOverlays` portal 到 `document.body`。空表、父组件重渲、Table empty 都拆不掉这块 React 树。

空表 placeholder 没有 `data-row-key`，不能走 `@dnd-kit/sortable`（`SortableRow` 对此走普通 `<tr>`）。

### 空表表头宽度为什么会跳

`scroll.y` 下 rc-table（本仓 `7.54.0`，antd 5.29.3 仍如此）两处一起抖：

1. `Body` 有数据时 `overflow-y: scroll`（常占 ~15px 槽），空数据改成 `auto`，槽消失，整表变宽。
2. `FixedHolder` `noData` 时 `isColGroupEmpty`，表头丢掉算宽 `<colgroup>`，scrollbar 占位 `th` 被浏览器当普通列均分，列宽再跳一次。[antd#56713](https://github.com/ant-design/ant-design/issues/56713)、[antd#57365](https://github.com/ant-design/ant-design/issues/57365)。

社区常见修法：`tableLayout: fixed`、`scrollbar-gutter: stable` 留槽、空表把 scrollbar `th` 钉在 15px（不要 `width: 0`，那会往反方向跳）。空筛选结果加 `.manage-ais-table--empty`，body `overflow-y: hidden`，**不要**为了稳表头而 `overflow-y: scroll` 画出一条空滚动条。只作用在 `.manage-ais-table`，不改其它 Settings 表。

## 关键文件

| 路径 | 职责 |
|------|------|
| [`src/shared/utils/manage-ais-table.utility.ts`](../../src/shared/utils/manage-ais-table.utility.ts) | 分区展示、列筛选、拖拽→启用槽位映射 |
| [`src/shared/utils/merge-enabled-ai-order.utility.ts`](../../src/shared/utils/merge-enabled-ai-order.utility.ts) | 启用槽位合并；松手后 persist 仍送已提交全表 id |
| [`src/Views/SettingsView/reaxels/settings-view/index.ts`](../../src/Views/SettingsView/reaxels/settings-view/index.ts) | `column_filter`（UI-only）；`isCommittedDisabled` 给表格置底 / 禁拖 |
| [`src/Views/SettingsView/components/ManageAIs/index.tsx`](../../src/Views/SettingsView/components/ManageAIs/index.tsx) | 表、DnD；Enabled=`Switch` / Preload=`Checkbox`；`displayedAIs` 读筛选项与 committed disabled |
| [`src/Views/SettingsView/layout/column-text-filter.tsx`](../../src/Views/SettingsView/layout/column-text-filter.tsx) | reaxper 面板 / 图标 / body portal |
| [`tests/manage-ais-table-ux.test.ts`](../../tests/manage-ais-table-ux.test.ts) | 展示序 / 筛选 / 钉位拖拽 |
| [`e2e/tests/ai-reorder-manage-ais.spec.ts`](../../e2e/tests/ai-reorder-manage-ais.spec.ts) | 表内左键拖启用行 |
| [`e2e/tests/manage-ais-filter.spec.ts`](../../e2e/tests/manage-ais-filter.spec.ts) | 列筛选不计 dirty；空表 portal Input |
| [`e2e/tests/ai-enable-draft-no-jump.spec.ts`](../../e2e/tests/ai-enable-draft-no-jump.spec.ts) | 未 Save 的 Enabled 不跳分区、不进菜单 |

## 禁止项

- 不要把表内展示序写回 `Data.AIs` / `reorder-ais`。
- 不要让未启用行参与 `@dnd-kit/sortable` 的拖/放。
- 不要在 toggle enable 时顺手重排数组，也不要用当前 `ai.disabled` 立刻置底；置底等表底 Save。
- 不要把 Enabled 列改回 Checkbox；Preload 列保持 Checkbox。
- 不要用 `overflow-y: scroll` 在空 `dataSource` 上常显滚动条。
- 不要为了表格改 FloatingView `forward` 或 menubar drag region。
- 不要把列筛选 open/value 放进组件 `useState` 或 React Context。
- 不要把筛选 Input 挂在 antd `filterDropdown` 里：空 `dataSource` 会跟表头单元格一起拆掉它。
- 不要每次按键重建 Table `columns`。
- 不要把 `column_filter` 写进 `buildSettingsFromStore` / dirty 快照。

## 与现有文档的关系

- 先读 [`ai-list-reorder.md`](./ai-list-reorder.md)：立即写盘、payload、echo、dirty。
- 提交范围（页脚 / 表底 / 弹窗）见 [`manage-ais-save-scopes.md`](./manage-ais-save-scopes.md)。
- 本文管表内看见什么、拖启用项如何映射回启用槽、筛选态为何在 reaxel；不取代那篇 IPC 契约。
