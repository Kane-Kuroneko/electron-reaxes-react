# currentAIView 调度链监控（WhiteScreenMonitor）

回前台闪白排查：先读 [`ai-view-foreground-white-flash.md`](../issues/ai-view-foreground-white-flash.md)，禁止项见 [`ai-view-background-throttling-postmortem.md`](../issues/ai-view-background-throttling-postmortem.md)。

本模块生产与开发都启用，**只观察**，不 remount、不踢绘、不 `capturePage`。

日志：`%APPDATA%/<app>/logs/white-screen-monitor.jsonl`（>20MB 轮转到 `.1`）。

## 落点

| 文件 | 职责 |
|------|------|
| `white-screen-monitor.retexel.ts` | begin/note/end、快照、JSONL、window-lifecycle |
| `Views/index.ts` | 唯一调度所有者上埋点 |
| `AI-Views/index.ts` | `instrumentView` 注册 viewId |

## 模式

| | 开发 | 生产 |
|--|--|--|
| 启用 | 是 | 是 |
| 模式 | `schedule-trace` | 同左 |
| 堆栈 | 开 | 关 |
| skipped-same-bounds | 记 | 不记 |
| 全量子层清单 | 开 | 关（仍有 window + 当前 view 快照） |

## 健康短切

```text
minimize  snapshot.bounds = 全屏（最大化时也不得变成 1×1）
restore   hierarchy-ready→layout-noop
focus     compositor-owned-noop
不得出现  restore-focus / focus-webContents
```

Alt-Tab 允许 `hierarchy-ready→input-focus`。不要用 `childrenCount` 单独解释是否复现。
