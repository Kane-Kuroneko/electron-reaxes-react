# Settings 侧栏切页性能监控

Settings 首次点进 **Manage AIs** 会卡一下。本模块**只观察**：把侧栏切页各阶段写到 JSONL，方便对照 keep-alive 之后「第一次挂载」和「再切回来」。

**不**在切入 Manage AIs 时检查 AI 目录；**不**改表格业务。

日志（dev）：`projects/ChatAIO/performance-logs/settings-menu-perf.jsonl`（同时进当次 `perf-*.jsonl`）。packaged 写 `userData/performance-logs/`。

## 不变量

1. 只 mark / flush，不改变 `RootMenu.current` 和面板挂载策略。
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
| [`src/Views/SettingsView/components/ManageAIs/index.tsx`](../../src/Views/SettingsView/components/ManageAIs/index.tsx) | 首次挂载与表格 layout |
| [`src/Main/services/performance/switch-perf.ts`](../../src/Main/services/performance/switch-perf.ts) | `settings-menu-*` 另写稳定文件名 |

## 禁止项

- 不要为了这份日志在切 tab 时 `checkAiCatalog` / `getDefaultAIs`。
- 不要用 `capturePage` 或改 FloatingView / 中心 AI 页生命周期。
