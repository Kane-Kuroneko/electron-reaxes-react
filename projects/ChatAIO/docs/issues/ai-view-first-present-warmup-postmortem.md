# AI View：预加载暖不了可见态 —— 复盘与 Agent 决策手册

## 文档状态

- **症状**：冷启动后第一次切到某个已预加载的 AI，SwitchAiBar 和中心页一起卡一下；体感像「切过去才开始加载」。网络其实早已结束。
- **状态**：ACCEPTED（2026-08-16，`f3c957a`）——**跟手优先**；每个 AI 第一次 `present` 的合成卡顿接受。v8 park 保留；实验探针与推迟露出已拆除。
- **读者**：下次想「把后台 AI 画暖」、改 `parkUnpresentedPreloadView`、或给切换加延迟的 agent / 开发者。**先读本文再动代码。**

### 关联文档（按阅读顺序）

| 文档 | 用途 |
|------|------|
| **本文** | 2026-08-15～16 探索全过程、日志证据、为什么暖机无效、禁止项、决策树 |
| [`ai-view-preload-first-switch-flash.md`](./ai-view-preload-first-switch-flash.md) | v1–v8 证伪表与现行 park 不变量 |
| [`ai-view-background-throttling-postmortem.md`](./ai-view-background-throttling-postmortem.md) | 为什么内容 view **不能**关 `backgroundThrottling` |
| [`ai-view-foreground-white-flash.md`](./ai-view-foreground-white-flash.md) | 单一所有者、`present(switch\|recover)`、L0/L1 |
| [`ai-page-switch-performance-optimization.md`](../features/ai-page-switch-performance-optimization.md) | 切换热路径 CPU / z-order 优化（另一类问题） |
| [`floating-view-rapid-switch-optimization.md`](../features/floating-view-rapid-switch-optimization.md) | SwitchAiBar 连点动画（Interrupt & Redirect） |
| [`docs/README.md`](../README.md) | 子工程文档总索引 |

产品索引入口：[`AGENTS.md`](../../AGENTS.md)「本子工程文档」。

---

## 1. 结论（先读这一节）

**预加载暖的是网络 + 文档 + JS 堆，暖不了「可见态第一帧」。**

`ready=true` / `webContents.isLoading()===false` / `did-finish-load` 只表示导航结束。v8 在 `did-stop-loading` 后约 400ms 把未首展页 `setVisible(false)`。此后 Chromium 走 `WasHidden`：SPA 停 `rAF`，合成帧可被 FrameEvictor 丢掉。用户点击时必须立刻 `present('switch')` + `setVisible(true)`，这时才 `WasShown`，才和 SwitchAiBar 抢同一块 GPU。

约束（不可破）：

1. **跟手第一**：点击后中心页立刻换页。卡顿是次要问题。
2. **节流保持默认开启**（`backgroundThrottling: true`）。关了会打断 `WasShown`，Alt-Tab 闪白。见节流复盘。
3. Electron **没有**「隐藏着把画面画完」的 API（[electron#42140](https://github.com/electron/electron/issues/42140) 仍开着）。

因此：**接受每个 AI 第一次 present 的卡顿。** 同一页第二次切换已经是热路径。不要为消这下卡去推迟露出、关节流、或把未首展页重新叠成多层可见。

---

## 2. 时间线（本次对话做了什么）

### 2.1 问题提出

冷启动点切换按钮切 AI view 非常卡，怀疑页面 load 与 FloatingView 同时渲染。要求：完整检查性能监测器，必须能从日志看出端倪，重点查 FloatingView 卡顿。

两者是**不同 renderer 进程**，JS 互不阻塞。共享的是 **GPU / 合成器**。

| 信号 | 含义 |
|------|------|
| `overlayShowMs` 很小（&lt;5ms）+ `toFirstPaint` 很小 | 卡不在 `showInactive` / FloatingView JS |
| `switch:loaf` 且 `scriptCount=0`、`blockingDuration=0` | FloatingView 主线程空闲，嫌疑是 GPU stall |
| `present-done` 仅 2–9ms | 卡不在 mount JS |
| `firstPresent=true` 的 span 掉帧显著高于热页 | 首次 `setVisible(true)` 唤醒整页 SPA 合成 |

当时监测缺口：LoAF 容易挂到会话第一次 `ctxId`；非首次切换没有 overlay 帧采样；AI `did-*-load` 对不上当前 switch。

### 2.2 错误方向：推迟冷页 `setVisible`

为错开中心页首绘和 SwitchAiBar 动画，曾把尚未 `hasPresented` 的 AI **推迟约 320ms 再 `setVisible(true)`**。

用户当场否决：点击后出现明显切换延迟，**不要修改正确的 UX**。随即撤回。点击后中心页必须立刻换页。

### 2.3 日志：网络早已完成，切过去才画

开发日志：`projects/ChatAIO/performance-logs/perf-*.jsonl`（dev `app.getAppPath()`）。预加载时间线当时还在 `%APPDATA%/ChatAIO-dev/logs/preload-flash-probe.jsonl`（探针已删除，结论如下）。

**会话 A**（`perf-2026-08-15T16-46-18.jsonl`）：启动约 **17 分钟**后才切。

| 切到 | `ready` | `isLoading` | 探针 | overlay 最长帧 |
|------|---------|-------------|------|----------------|
| Grok / Gemini / DeepSeek / Perplexity / Claude / AI Studio | true | **false** | `hydrated-then-frozen` | 49–97ms |

- 各 AI 启动后 **2–11s** 已 `did-finish-load` / `did-stop-loading`。
- 首切：`attached=true`、`visible=false`、全尺寸 `1537×800`、`loading=false`，`loadAgeMs` ≈ **1000–1011s**。
- 首切后 **没有**再打 `did-stop-loading`；perf 里 `ai:load-*` 为 0。
- LoAF：`scriptCount=0`，最长约 92ms。

不是「切过去才 `loadURL`」。是第一次把 hidden 的 WebContentsView 露出来。

**会话 B**（`perf-2026-08-15T16-24-23.jsonl`）：启动后 **7–19s** 连切。

- 第一圈（各 AI 第一次 present）：overlay `maxFrameDelta` 最高 **125ms / 167ms**；有的页 `isLoading=true`（切太早）；Grok 在 `isLoading=false` 之后仍出现 `ai:load-start`（hidden→visible 叫醒 SPA）。
- 第二圈（`hasPresented=true`）：最长帧 **7–21ms**，几乎不掉帧。

二次切换丝滑，因为第一次 present 已经把 SPA 以可见态跑完；切走只 detach，进程和 DOM 还在。

### 2.4 架构结论与清理

在「跟手第一 + 节流保持开」下，没有正确的 Chromium 生命周期能让 hidden 页保持已绘制。唯一还算架构内的启发式（当前页 ±1 邻居盖下常驻可见）不建议做：第一次点击仍叠 overlay 首显，多一层全尺寸 WCV 可能更卡；乱序跳转仍然冷。

随后拆除实验代码：未落地的 overlay 逐次帧采样 / `ai:load-*` / `setActiveCtx` / 推迟露出 phase；已提交的 `preload-flash-probe.retexel.ts`。调度观察只留 `white-screen-monitor.jsonl`。

---

## 3. 为什么「暖机」暖不了渲染

v8 现行（必须保留）：

```text
loadURL（网络 + HTML/JS）          ← 这个会完成，日志里 ready=true
  ↓ 有盖且仍在 isLoading → 盖下 visible
did-stop-loading + ~400ms
  ↓ park：setVisible(false)，仍 attach+全尺寸
点击
  ↓ present('switch') 立刻 setVisible(true) + 置顶
WasShown → SPA 可见态 hydrate + 合成器首帧   ← 用户感到的卡
```

`parkUnpresentedPreloadView`：`shouldShow = coverReady && stillLoading`。load 完必须藏，否则回到 v7 的 7 层同时合成。

三层机制叠在一起，hidden 页无法保持「已渲染」：

1. **Page Visibility**  
   `setVisible(false)` 后 `document.visibilityState=hidden`。ChatGPT / Grok / Gemini 等 SPA 会停 `requestAnimationFrame`、IntersectionObserver、懒渲染。Electron 文档也建议 hidden 时暂停重活。网络可以继续，**首屏 JS 可以故意不画**。

2. **默认 `backgroundThrottling`**  
   内容 WCV 必须保持默认 `true`。hidden 后定时器被节流，合成器走 `WasHidden`。`false` 会踩 `disable_hidden.patch`，`WasShown` 短路，FrameEvictor 失步 → Alt-Tab 闪白（[electron#42378](https://github.com/electron/electron/issues/42378)、[electron#41276](https://github.com/electron/electron/issues/41276)）。

3. **FrameEvictor**  
   不可见 surface 的合成帧会被丢掉；条数一多或闲置约 5 分钟会 cull。会话 A 闲置 16 分钟，首切时 GPU 上几乎没有旧帧。会话 B 只隔 7 秒也卡，说明 **就算帧还在，SPA 可见态 hydrate 本身就够卡**。

`paintWhenInitiallyHidden` 默认已是 `true`，只帮「窗还没 show」的首帧，帮不了后来的 `setVisible(false)`。

---

## 4. 已证伪 / 已拒绝（含本次对话）

v1–v7 详见 [`ai-view-preload-first-switch-flash.md`](./ai-view-preload-first-switch-flash.md)。下面是 **2026-08-15～16 又试过或认真评估过** 的：

| 做法 | 结果 | 处置 |
|------|------|------|
| 冷页推迟 ~320ms 再 `setVisible(true)` | 点击后中心页明显延迟 | **立即撤回**。禁止再以错开 GPU 为名推迟换页 |
| 关 `backgroundThrottling` 保活 | Alt-Tab 闪白 | 禁止。节流复盘 |
| 7 层全尺寸一直可见（v7） | 白闪没了，切换更卡 | 禁止 |
| 1×1 park / ±1 bounds / 热路径 `capturePage` / cover-handoff | 闪白或看起来像重新 load | 禁止 |
| ±1 邻居盖下常驻可见（2 层合成） | 理论上顺序 Ctrl+[/] 可能从「叫醒 hidden」变成「提升已在画的一层」 | **不建议做**：第一次点击仍与 overlay 首显抢 GPU；乱序跳转仍冷；多一套邻居状态机。启发式，不是补上缺失 API |
| 加长 400ms 画窗 | 用户若在画窗外才切（常见），无效 | 不要拿它当暖机 |

社区绕法（1×1 park、两阶段 resize、关节流）正好是 ChatAIO 已经否掉的路径。

---

## 5. 两笔彼此独立的「第一次」卡顿

不要把它们揉成一个 bug：

| 卡 | 何时 | 日志 | 消不掉？ |
|----|------|------|----------|
| AI 第一次 `present` | 某个 `hasPresented=false` 的页第一次被置顶露出 | `firstPresent`、hidden→visible、偶发切后 `did-stop-loading` | 接受。二次切同一页应丝滑 |
| SwitchAiBar overlay 冷启动首显 | 本进程第一次把 overlay 从 concealed 露出 | `fv:first-overlay-show`，`maxFrameDelta` ~90ms | 接受。启动时 warmup-show/hide **留不住**帧，和 AI hidden 是同一类限制。后续 `fv:show` 应是 0–1ms |

会话第一次点击常常 **两笔叠在一起**。即使中心 AI 魔法般已暖，overlay 首显仍在。

---

## 6. Agent 决策树

```text
用户报告「切 AI 卡 / 切过去才加载 / 预加载没用」
│
├─ 是否想推迟 setVisible / cover-handoff / 等动画再换页？
│   └─ 是 → 停止。跟手第一。见 §1、§4
│
├─ 是否想对内容 WCV 设 backgroundThrottling:false / 关节流保活？
│   └─ 是 → 停止。读节流复盘。会 Alt-Tab 闪白
│
├─ 是否想让未首展页一直 visible 叠在当前页下（含「只留邻居」）？
│   └─ 是 → 默认拒绝。v7 已证多层合成卡切换；邻居方案见 §4，不要当正确架构
│
├─ 是否二次切换同一 AI 也卡？
│   └─ 是 → 不是本文问题。查 present 热路径 / overlay 连点（rapid-switch 文档）
│   └─ 否（仅每个 AI 第一次） → 预期行为，接受
│
├─ 是否仅 SwitchAiBar 第一次出现卡、之后 fv:show ~0ms？
│   └─ 是 → overlay 冷首显，接受；不要为此把 AI 层重新叠可见
│
└─ 是否白闪 / 切后台再回来白屏？
    └─ 是 → 另一篇：节流复盘 + foreground-white-flash，不是暖机问题
```

---

## 7. 禁止清单

| 禁止 | 原因 |
|------|------|
| 点击后推迟中心页 `setVisible` / cover-handoff | 牺牲跟手 |
| 内容 WCV / 主窗 `backgroundThrottling: false` | 打断 WasShown；Alt-Tab 闪白 |
| 未首展页 load 完仍多层全尺寸 `visible=true` | v7 切换卡顿 |
| `park` 在 present 热路径把已 load 完的页重新 `setVisible(true)` | 叠层合成 |
| 热路径 `capturePage` / ±1 bounds / `invalidate` 踢绘 | 闪白、假修好 |
| 未首展页 `removeChildView` | 饿死后台 load / SPA |
| `applyVisibility` 里 `addChildView` / `present` | 破坏单一所有者 |
| 再加首切专用探针 / 用监测当踢绘 | 已拆除；调度只看 white-screen-monitor |
| 把 FloatingView overlay rebind 抄到中心 view | 不同 surface 模型 |

---

## 8. 代码落点（2026-08-16 基线）

| 文件 | 职责 |
|------|------|
| `Views/index.ts` `parkUnpresentedPreloadView` | 未首展：不 detach；`shouldShow = coverReady && loading` |
| `Views/index.ts` `presentActiveCenterView('switch')` | 立刻 mount + `setVisible(true)`；禁止推迟 |
| `AI-Views/index.ts` | load 结束后 `schedulePreloadFreezeAfterHydrate`（~400ms 再 park） |
| `initWebContentsView.ts` | 默认节流；创建时 `setVisible(false)` 再布局 |
| `white-screen-monitor.retexel.ts` | 调度链 JSONL，无 capturePage |

`preload-flash-probe.retexel.ts` **已删除**。不要恢复。

---

## 9. 监测怎么读（探针删除后）

- 切换分段：`projects/ChatAIO/performance-logs/perf-*.jsonl`，`npx tsx projects/ChatAIO/scripts/analyze-perf-logs.ts --latest`
- 调度链：`%APPDATA%/<app>/logs/white-screen-monitor.jsonl`
- **不要**用 `ready` / `isLoading=false` 当「已经画暖」。只能当「文档导航结束」
- 现行 recorder **没有** `ai:load-*` / `firstPresent` / overlay 逐帧采样（探针已删）。§2 那些字段只存在于当时的实验日志。预加载有没有发生，看创建后的 `did-finish-load` / `did-stop-loading`，不要在 switch span 里找 load 事件

期望：

- 第一次 present：overlay 可能掉帧；`present-done` 仍应是几毫秒
- 第二次及以后切同一 AI：overlay 最长帧应接近 1 帧预算（会话 B：7–21ms）
- 点击到中心页换页：**无**可感知延迟

---

## 10. 教训摘要

> **跟手是本，消卡是末。Hidden WebContentsView 在 Chromium 里就是不产可见帧；预加载不是预绘制。每个 AI 付一次可见态 hydrate 税，之后走热路径。**

---

## 11. 变更历史

| 日期 | 变更 |
|------|------|
| 2026-08-15 | v8：盖下 hydrate，load 完 hidden |
| 2026-08-15 | 误加推迟冷页 `setVisible`；用户否决后撤回 |
| 2026-08-16 | 日志证实暖的是网络不是合成器；接受第一次 present 卡顿 |
| 2026-08-16 | 拆除 preload-flash-probe 与未落地排查埋点；本文档 |
