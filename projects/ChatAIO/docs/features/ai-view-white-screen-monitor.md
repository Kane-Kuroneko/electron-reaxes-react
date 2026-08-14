# currentAIView 调度链监控（WhiteScreenMonitor）

## 目的

回前台白闪/白屏排查：**先读** [`ai-view-background-throttling-postmortem.md`](../issues/ai-view-background-throttling-postmortem.md)，再读 [`ai-view-foreground-white-flash.md`](../issues/ai-view-foreground-white-flash.md)。本模块**生产与开发一律启用**，只做**观察**，不自动 remount / 不自行踢绘。

核心要求：

1. **无明显副作用** — 默认**不**调用 `capturePage`（会踢 compositor 产帧，掩盖真白屏）。
2. **追踪 view 调度链** — 面向 agent 的 JSONL：用 `chainId` + `seq` 串起 blur→focus/show/restore→hierarchy 决策→mount/detach/bounds/focus。

## 落点（少侵入）

| 文件 | 职责 |
|------|------|
| `white-screen-monitor.retexel.ts` | begin/note/end、快照、JSONL |
| `preload-flash-probe.retexel.ts` | **预加载首切**诊断（v8：hydrate 后 hidden 减合成层；只写 jsonl，无 capturePage） |
| `Views/index.ts` | **唯一调度所有者**上埋点（present / L0 / L1 / mount / detach / bounds / focus / blur|hide|minimize） |
| `AI-Views/index.ts` | 仅 `instrumentView` 注册 viewId（不散落探针） |

## 模式

| | 默认（prod + dev） |
|--|--|
| 启用 | 是 |
| 模式 | `schedule-trace`（观察调度链） |
| 堆栈 | 开发开 / 生产关 |

## 预加载首切探针（PreloadFlashProbe）

针对「开启 preload 后首次切换仍闪 / 切过去才 load」：

| | 行为 |
|--|--|
| 日志 | `%APPDATA%/<app>/logs/preload-flash-probe.jsonl`（**只写文件，不打控制台**） |
| 暖机 | v8 未首展 load 中盖下可见，load 完 attach+hidden+全尺寸；记录 load 时间线 |
| 首切 | `!hasPresented`：pre 快照 + 立即 verdict（**无 capturePage**） |
| 副作用 | 观察 only；日常回前台与首切热路径均无 capturePage |
| 控制台 | 无。Agent 自己读 jsonl |

Verdict 含义见 [`ai-view-preload-first-switch-flash.md`](../issues/ai-view-preload-first-switch-flash.md) §Probe。

复现后 **不要**让用户复制控制台；直接读 `userData/logs/preload-flash-probe.jsonl`。

## 链上会看到什么

典型回前台链：

```text
blur|hide|minimize          → background-marked
focus|show|restore enter    → soft-recover / recover-after-focus
hierarchy-check decision    → hierarchy-ready→focus-only | hierarchy-ready→bounds+focus
                              或 hierarchy-broken→present-recover
mount-* / set-bounds / detach / set-visible / restore-focus
exit                        → focus-only-done | bounds-focus-done | …
```

（已恢复默认节流；调度侧无 surface rebind / capturePage。）

## 日志

固定路径（追加，>20MB 轮转到 `.1`）：

```
%APPDATA%/<app>/logs/white-screen-monitor.jsonl
%APPDATA%/<app>/logs/preload-flash-probe.jsonl
```

`session-start` 含 `mode: schedule-trace`、`sideEffect: none-observe-only`、`agentHint`、runtime 版本信息。

### 给 agent 的用法

1. 按 `chainId` 过滤，按 `seq` 排序。
2. 看 `decision=hierarchy-broken|hierarchy-ready→focus-only|hierarchy-ready→bounds+focus|mount-*|detach`。
3. 与前一条 `blur`/`hide`/`minimize` 对照。
4. 预加载首切：读 `userData/logs/preload-flash-probe.jsonl`（warmup → first-switch-pre → verdict），**不要**让用户复制控制台。

## 禁止事项

本监控**不得**演化为自动 `present('switch')` / ±1 踢绘 / 二次 `addChildView`。
回前台与预加载首切热路径均禁止 `capturePage`。
修复仍走 `ai-view-foreground-white-flash.md`：默认节流 + 回前台 focus-only。
