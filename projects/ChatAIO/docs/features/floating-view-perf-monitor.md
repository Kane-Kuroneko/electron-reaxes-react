# FloatingView 正式包性能 / 使用轨迹监控

菜单绝对选中和 Next/Prev 之后轮播仍可能卡。本模块**只观察**：把每次手势的轨迹和分段耗时写到 JSONL，给正式包装好的安装包排查用。

**不**改切换、不 `slideTo`、不 `capturePage`、不 remount、不踢绘。

## 日志在哪

正式包装好后写：

```text
%APPDATA%\ChatAIO\logs\floating-view-perf.jsonl
```

也就是 `app.getPath('userData')/logs/floating-view-perf.jsonl`，和 `white-screen-monitor.jsonl` 同目录。

| 运行方式 | userData | 本文件 |
|---------|----------|--------|
| 安装包 | `%APPDATA%\ChatAIO` | `logs\floating-view-perf.jsonl` |
| unpackaged / 本仓 yarn start | `%APPDATA%\ChatAIO-dev` | 同上相对路径 |
| E2E | 临时隔离目录 | 同上 |

超过 20MB 轮转到 `floating-view-perf.jsonl.1`。启动写一条 `fv-perf:session-start`（版本 / 是否 packaged / 平台）。

原先的 `performance-logs/carousel-ops.jsonl` 仍记轮播契约（DOM / faults），本文件不搬那些大快照。`perf-*.jsonl` 仍收全量 switch 分段。

## 不变量

1. 生产与开发都启用。正式包不靠 DevTools。
2. 只 mark / flush，不改变 `selectAIFromMenu` / Next / Prev 的呈现。
3. 走已有 IPC `perf-event`，不新开通道。
4. 菜单选中仍是 hide + prepare；顺序切换仍是一次 `slideNext` / `slidePrev`。

## 触发器

用户说主要用菜单点名和 next/prev。这三类都会开一条轨迹：

| trigger | 用户手势 | 主进程入口 |
|---------|----------|------------|
| `menu-select` | Application Switch AI / 中区 Current AI 下拉 | `selectAIFromMenu` |
| `next` / `prev` | Next / Previous AI Page | `turnToAiPageByOffset` |
| `next-opened` / `prev-opened` | Prev/Next Opened | `turnToInstantiatedAiPageByOffset` |
| `close` | 关当前页 | `closeCurrentAIView` |
| `fv-perf:skipped` | 40ms 内重复按、空列表 | 仍记一条，没有完整时间线 |

`seq` 是本进程手势序号。`intervalMs` 是距上一次手势的间隔。用这两项就能还原「菜单点远处 → 连按 Next」的使用轨迹。

## 阶段

每条事件带 `ctxId`、`ts`、`hrt`、`msFromTrigger`、`trigger`、`seq`。

| phase | 何时 |
|-------|------|
| `fv-perf:session-start` | 进程启动，打开日志 |
| `fv-perf:trigger` | 主进程收到手势。含 from/to id、label、下标、列表来源、overlayIntent |
| `fv-perf:skipped` | 被去重或空列表丢掉 |
| `fv-perf:ai-view-begin` / `ai-view-end` | `showAIView` / 中心页切换前后 |
| `fv-perf:ipc-sent` / `ipc-received` | 主进程发出 hide+prepare 或 show；渲染进程接到 |
| `fv-perf:prepare` | 隐藏停靠写入 store |
| `fv-perf:ui-updated` | show 落到 store。`revealPath`：`direct` / `hold-same-list` / `hold-rebuild-list` |
| `fv-perf:overlay-show` / `overlay-hide` | 条亮/灭 |
| `fv-perf:swiper-remount` | items 长度变化强制重建 Swiper |
| `fv-perf:active-index` | 可见顺序步。含 isRapid、speed、距上次步的 elapsed |
| `fv-perf:swiper-begin` / `css-transition-start` | 真正调用 slideNext/Prev |
| `fv-perf:first-paint` | 条可见后双 rAF |
| `fv-perf:swiper-end` | transitionEnd。过早 complete 标 `premature` |
| `fv-perf:complete` | 菜单：隐藏 park 提交后一帧；顺序步：最终 transitionEnd。同一 ctx 只一次 |
| `fv-perf:loaf` | 可见切换期内 Long Animation Frame |
| `fv-perf:frame-stats` | 该次可见手势约 800ms 的 rAF 摘要（avgFps / maxFrameDeltaMs / droppedFrames） |

同一 `ctxId` 下还会把既有 `switch:*` / `fv:*` 镜像进这份文件（不含 `carousel:op` 的 DOM 快照）。

## 怎么读

1. 按 `fv-perf:trigger` 的 `seq` 排使用轨迹。
2. 同一 `ctxId` 按 `msFromTrigger` 看卡在哪一段。
3. 菜单后 Next 卡：看这次 `next` 的 `revealPath` 是不是 `hold-rebuild-list`、有没有 `swiper-remount`、`first-paint` / `swiper-begin` 是否拉开。
4. 连按 Next 卡：看 `intervalMs`、`isRapid`、`frame-stats.maxFrameDeltaMs`、`fv-perf:loaf`。
5. `complete` 缺失：手势没走完（进程退出、动画被打断）。看最后一条 phase。

## 关键文件

| 路径 | 职责 |
|------|------|
| [`src/shared/utils/floating-view-perf.utility.ts`](../../src/shared/utils/floating-view-perf.utility.ts) | begin / note / complete、trigger 名 |
| [`src/Main/services/performance/switch-perf.ts`](../../src/Main/services/performance/switch-perf.ts) | 正式包落盘、轮转 |
| [`src/Main/reaxels/Views/index.ts`](../../src/Main/reaxels/Views/index.ts) | menu-select / next / prev 开轨迹 |
| [`src/Views/FloatingView/reaxels/floating-view/index.ts`](../../src/Views/FloatingView/reaxels/floating-view/index.ts) | prepare / show / hide |
| [`src/Views/FloatingView/components/SwitchAiBar/index.tsx`](../../src/Views/FloatingView/components/SwitchAiBar/index.tsx) | remount / 一格动画 / complete |
| [`src/Views/FloatingView/utils/gesture-frame-sampler.utility.ts`](../../src/Views/FloatingView/utils/gesture-frame-sampler.utility.ts) | 每次可见手势的帧摘要 |
| [`src/Views/FloatingView/utils/loaf-observer.utility.ts`](../../src/Views/FloatingView/utils/loaf-observer.utility.ts) | LoAF 摘要进本文件 |

## 禁止项

- 不要为这份日志 `showSwitchAiBar` 菜单选中，或改成 `slideTo` / 连滑。
- 不要 `capturePage`、不要为采样改 FloatingView `forward`。
- 不要常驻 rAF；只在可见手势窗口内采，且只写摘要。
- 不要把 DOM 全量 slides 写进本文件（那是 `carousel-ops.jsonl`）。

## 与现有文档

- [轮播绝对选中](../issues/floating-view-carousel-absolute-select.md)：呈现契约；本文件只记耗时。
- [快速切换](./floating-view-rapid-switch-optimization.md)：连点短动画。
- [Settings 切页埋点](./settings-menu-switch-perf.md)：同类 JSONL，另一条产品路径。
- [白屏监控](./ai-view-white-screen-monitor.md)：同目录 `logs/`，中心 AI 页调度链。
