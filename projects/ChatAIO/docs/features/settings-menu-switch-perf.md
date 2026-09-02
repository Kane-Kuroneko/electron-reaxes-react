# Settings 侧栏切页性能监控

Settings 首次点进 **Manage AIs** 会卡一下。本模块**只观察**：把侧栏切页各阶段写到 JSONL，方便对照 keep-alive 之后「第一次挂载」和「再切回来」。

**不**在切入 Manage AIs 时检查 AI 目录。表格在量到 `scroll.y` 之后、**首帧已经画完工具栏**再挂载（切页先跟手；antd Table + dnd 仍会在下一帧卡一下）。

日志（dev）：`projects/ChatAIO/performance-logs/settings-menu-perf.jsonl`（同时进当次 `perf-*.jsonl`）。packaged 写 `userData/performance-logs/`。

## 不变量

1. 埋点只 mark / flush，不改变 `RootMenu.current`。面板 keep-alive 与表格延后挂载是产品行为，不是埋点副作用。
2. 走已有 IPC `perf-event`，不新开通道。
3. 切到 Manage AIs 的首次挂载必须等到表格 layout（含 `scroll.y`）或 2s 超时才 `complete`，避免只记到壳子 paint。

## 阶段

| phase | 何时 |
|-------|------|
| `settings-menu:select-start` | 侧栏 `onSelect` |
| `settings-menu:dirty-computed` | 该次 trace 内 `isDirty()` 耗时 |
| `settings-menu:app-layout` | App `useLayoutEffect(current)` |
| `settings-menu:first-paint` | App 双 `rAF` |
| `settings-menu:panel-mount` | `RCManageAIsPanel` 首次函数体 |
| `settings-menu:panel-layout` | 面板 `useLayoutEffect` |
| `settings-menu:scroll-y` | `useHostScrollY` 第一次给出高度 |
| `settings-menu:panel-paint` | 面板双 `rAF` |
| `settings-menu:longtask` | 窗口期内 LoAF / longtask |
| `settings-menu:complete` | 结束（`source`: app / panel / timeout） |

字段：`firstVisit`、`from`/`to`、`aiCount`、`msFromSelect`。

## 关键文件

| 路径 | 职责 |
|------|------|
| [`src/Views/SettingsView/layout/settings-menu-perf.utility.ts`](../../src/Views/SettingsView/layout/settings-menu-perf.utility.ts) | begin / note / end |
| [`src/Views/SettingsView/layout/use-settings-menu-perf.ts`](../../src/Views/SettingsView/layout/use-settings-menu-perf.ts) | App 壳：select / dirty / layout / first-paint |
| [`src/Views/SettingsView/App.tsx`](../../src/Views/SettingsView/App.tsx) | 侧栏、keep-alive、页脚；埋点走 hook |
| [`src/Views/SettingsView/components/ManageAIs/index.tsx`](../../src/Views/SettingsView/components/ManageAIs/index.tsx) | 首次挂载；有 `scroll.y` 再挂 Table |
| [`src/Views/SettingsView/layout/use-host-scroll-y.ts`](../../src/Views/SettingsView/layout/use-host-scroll-y.ts) | 空宿主先量高 |
| [`src/Main/services/performance/switch-perf.ts`](../../src/Main/services/performance/switch-perf.ts) | `settings-menu-*` 另写稳定文件名 |

## 读日志：为什么 42 行也会卡

数据量不是瓶颈。两次 firstVisit（`aiCount: 42`）时间线几乎一样：

| 阶段 | 约 ms | 含义 |
|------|-------|------|
| `dirty-computed` | 0.5–0.8 | `isDirty()` 可忽略 |
| `panel-mount` | 3 | 面板函数体开始，JS 入口不贵 |
| `panel-layout`（`scrollY: null`） | 141–151 | **第一遍**：antd Table **没有** `scroll.y`，按普通表把 42 行交互单元格全部 layout |
| `panel-layout` + `scroll-y` | 264–295 | **第二遍**：量到高度后改 `scroll.y`，Table 切成固定表头 + body，等于整表重建 |
| `longtask` `self` | duration 292–319 | 主线程被上述两次 commit 占满 |
| `complete` | 315–338 | 再加两帧 paint |

再切回来 10–20ms，是因为 keep-alive（`display: none`）不再挂载。

42 条 JSON 很小，但每一行都是 Checkbox + Switch + Tag + 3 个 Button + Popover + dnd-kit `useSortable`。卡的是 **React 首次挂载这张重表，还挂了两遍**，不是列表数据计算。

对策：宿主空着先量高，首帧只画工具栏，有 `scroll.y` 后的下一帧再挂 Table。`useHostScrollY` 在 `useLayoutEffect` 里 `setState`，会在 paint 前同步再渲一次；因此不能「有 y 就挂表」，必须另用 `useEffect` 把挂表推到首帧之后。`complete` 仍等表格 paint。切页应先出现 Manage AIs 标题/按钮，表格随后填入。

## 禁止项

- 不要为了这份日志在切 tab 时 `checkAiCatalog` / `getDefaultAIs`。
- 不要用 `capturePage` 或改 FloatingView / 中心 AI 页生命周期。
- 不要为了少一次 render，在量到 `scroll.y` 的同一轮 `useLayoutEffect` flush 里挂 Table。
