# AI View：开启 Preload 后首次切换闪烁 / 切过去才开始 load

## 文档状态

- **症状（已拆成两件事）**：
  1. 预加载页被硬 detach 或 `setVisible(false)+1×1`，Chromium / SPA 停转，**切过去才开始 load**。
  2. 多层全尺寸可见 WebContentsView 同时合成，**切换卡顿**；JS `present-done` 本身只有 2–9ms。
- **状态**：FIXED（2026-08-15）——**v8：盖下 hydrate，load 完 hidden 减合成层；拆页 defer；热路径无 capturePage**。
- **残留（不是 v8 present）**：冷启动**第一次**调出 SwitchAiBar 仍可能卡一下，见文末。
- **关联**：[`ai-view-white-screen-monitor.md`](../features/ai-view-white-screen-monitor.md)、[`ai-view-background-throttling-postmortem.md`](./ai-view-background-throttling-postmortem.md)。

---

## 已证伪路径

| 版本 | 做法 | 结果 |
|------|------|------|
| v1 soft-hide | 闲置 `setVisible(false)` 当 **compositor 暖机** | 不产帧，首切仍闪（目标搞错了） |
| v2 offscreen park | `x=-99999` + `visible=true` | Win 上 `capturePage` 恒 empty，无 on-screen surface |
| v3 闲时盖下暖机 | 全部 `!hasPresented` 叠在当前页下 | **切换无效 / 白屏**（先 detach 顶页 + `addChildView` 搅 z-order） |
| v4 短超时 cover-handoff | 盖下等 ~170ms 再 `addChildView` 置顶 | **延迟 + 白屏** |
| v5 揭盖 yield | 闲置硬 detach + 32ms yield 揭盖 | **切过去才 load**（detach 饿死加载）+ 全屏截图卡顿 |
| v6 hidden+1×1 hold | 未首展 attach+hidden+1×1 | 文档能 load，但 SPA 冻在 `visibilityState=hidden` / 1px；首切 `did-stop-loading` 再响，看起来像重新加载 |
| v7 盖下全尺寸可见 | 未首展 attach+visible+全尺寸，先置顶再 detach | **闪烁几乎没了**；**切换仍明显卡**（7 层全尺寸同时合成） |

v6 日志（2026-08-15，`sideEffect=none-observe-only`）：

- 各 AI 在创建后 1–6s 已 `did-finish-load`；首切 `attached=true visible=false bounds=1×1 isLoading=false`。
- Grok 首切后 **199ms** 又 `did-stop-loading`：hidden→visible 把 SPA 叫醒。
- Electron `present-done` 仅 1–4ms，卡顿来自露出后的 hydrate / 从 1px 撑开，不是 mount 本身。

v7 日志（2026-08-15）：

- 首切 pre：`attached=true visible=true` 全尺寸，`isLoading=false`，verdict `under-cover-warmed`。
- `present-done` 仍 3–9ms；白屏监控 `childrenCount` 从 7 往下掉。
- 感知卡顿来自 Windows 合成器同时叠 7 个全尺寸可见 WebContentsView，加上切换热路径里 `park` 把已 load 完的页重新 `setVisible(true)`。

---

## 修复策略 v8（当前）

不变量：

1. 中心区用户可见顶层恰好 1 个（Settings 打开时为 Settings）。**hydrate 完成后，未首展页不再参与合成。**
2. **未首展预加载禁止 `removeChildView`**。保持 `attach + 全尺寸`。
   - **仍在 `isLoading`** 且有可见顶页盖住 → `visible=true`（盖下 hydrate，避免 v6 SPA 冻结）。
   - **`did-stop-loading` 后约 400ms** → `visible=false`（DOM 还在，GPU 停）。从一开始就 hidden 会冻 SPA；hydrate **之后**再藏，首切只唤醒一层。
3. **`park` 不得在每次 present 时把已 load 完的页重新 `setVisible(true)`。** `shouldShow = coverReady && stillLoading`。
4. **已首展闲置页仍硬 detach**（二次切换已验证丝滑）。`removeChildView` 放到 `setImmediate`，带 generation，避免连点切页拆掉刚置顶的页。
5. `applyVisibility` / `park` **不得 `addChildView`**；mount 唯一入口仍是 `presentActiveCenterView`。
6. 热路径：已在顶层则跳过 `addChildView`；bounds 未变则跳过 `setBounds`；不要扫一遍未首展 park。
7. Darwin：已在树里暖机的未首展页 **不要** remove+add；只置顶。
8. 热路径 **禁止 `capturePage`**。不设 `backgroundThrottling:false`。探针只写 jsonl。不要 cover-handoff。

行为：

1. **创建预加载 view**：`initWebContentsView` 已 `addChildView` + `setVisible(false)`，随即 park 到中心全尺寸；若当时没有可见顶页，保持 hidden（文档仍可 `loadURL`）。
2. **首次 present 当前 AI 之后**：未首展若仍在 load，盖下 `visible=true`。
3. **各页 `did-stop-loading` + 400ms**：park → `visible=false`，仍 attach+全尺寸。
4. **首切**：同步置顶（可能 `setVisible(true)` 唤醒一层）。其它未首展保持 hidden，不重新露出。
5. **已首展再切走**：下一拍硬 detach。

若首切露出时出现 **1 帧** compositor hitch，那是单层 surface 重建，比 v7 的 7 层 reorder 轻。若 SPA 又在 hidden 下冻住（切过去才 `did-stop-loading`），不要回到 7 层常驻可见，只加长 400ms 画窗。

---

## Probe（复现）

日志：`%APPDATA%/ChatAIO-dev/logs/preload-flash-probe.jsonl`  
不要让用户复制控制台。Agent 自己读。过滤 `type=preload-flash`。

等预加载跑完再切（约 1–2s 后）：期望 `first-switch-pre` 为 `attached=true visible=false`，bounds 为中心全尺寸（不是 1×1），`loading=false`，verdict **`hydrated-then-frozen`**。  
若在 load / 400ms 画窗内就切：`visible=true`，verdict `under-cover-warmed`。  
白屏监控：切换时中心可见层应接近 1，而不是 7。  
首切后 2s 内不应再出现 `did-finish-load`；若立刻又 `did-stop-loading`，对照是否又冻在 hidden。

| Verdict | 含义（v8） |
|---------|------------|
| `hydrated-then-frozen` | **预期（等 load 完再切）**：attach+hidden+全尺寸，SPA 已 hydrate |
| `under-cover-warmed` | 仍在 load / 画窗内盖下可见 |
| `still-hidden-on-switch` | 从未 load 完就 hidden：盖未就绪，切过去 SPA 可能醒 |
| `tiny-bounds-on-switch` | 回归 1×1：首切会从 1px 撑开 |
| `still-loading-on-switch` | 切太早，或后台导航仍被饿死 |
| `detached-before-switch` | 回归：又被硬 detach，load 会被饿死 |

---

## 残留：冷启动第一次切换仍卡

不是 v8 `present` 热路径。2026-08-15 最新 session：

- 探针 verdict `hydrated-then-frozen`；`present-done` **4ms**；预加载页 `visible=false` + 全尺寸。
- 同一次切换带 `fv:first-overlay-show`。`switch:first-show-stats`：`minFps=11`，`maxFrameDeltaMs=90`，`msToFirstComplete=309`。
- 第二次及以后：`fv:show` 0–1ms；swiper ~300ms 是动画时长，不是 hitch。

这是 SwitchAiBar overlay 冷启动首显（合成器 / 首帧），与预加载盖下 hydrate 无关。不要为此把未首展页重新叠成多层可见。
