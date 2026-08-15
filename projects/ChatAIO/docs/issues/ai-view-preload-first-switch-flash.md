# AI View：开启 Preload 后首次切换闪烁 / 切过去才开始 load

## 文档状态

- **症状（已拆成两件事）**：
  1. 预加载页被硬 detach 或 `setVisible(false)+1×1`，Chromium / SPA 停转，**切过去才开始 load**。
  2. 多层全尺寸可见 WebContentsView 同时合成，**切换卡顿**；JS `present-done` 本身只有 2–9ms。
- **状态**：FIXED（2026-08-15）——**v8：盖下 hydrate，load 完 hidden 减合成层；拆页 defer；热路径无 capturePage**。
- **已接受（2026-08-16）**：每个 AI **第一次 present** 仍可能卡一下（hidden 页没有可见态合成帧）。点击必须立刻换页；默认节流保持开启。二次切换已验证丝滑。不要为这一下关节流、推迟 `setVisible`、或把未首展页重新叠成多层可见。
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
8. 热路径 **禁止 `capturePage`**。不设 `backgroundThrottling:false`。不要 cover-handoff。不要为消卡而推迟点击后的 `setVisible`。

行为：

1. **创建预加载 view**：`initWebContentsView` 已 `addChildView` + `setVisible(false)`，随即 park 到中心全尺寸；若当时没有可见顶页，保持 hidden（文档仍可 `loadURL`）。
2. **首次 present 当前 AI 之后**：未首展若仍在 load，盖下 `visible=true`。
3. **各页 `did-stop-loading` + 400ms**：park → `visible=false`，仍 attach+全尺寸。
4. **首切**：同步置顶（可能 `setVisible(true)` 唤醒一层）。其它未首展保持 hidden，不重新露出。
5. **已首展再切走**：下一拍硬 detach。

首切露出时可能有 **1 帧** compositor hitch：单层 surface 重建 + SPA 可见态 hydrate。这比 v7 的 7 层 reorder 轻，也是当前架构下接受的代价。Electron 没有「隐藏着把画面画完」的 API（[electron#42140](https://github.com/electron/electron/issues/42140)）。不要回到 7 层常驻可见，不要加长画窗来「再暖一点」，不要推迟点击后的 `setVisible`。

调度回归用 [`ai-view-white-screen-monitor.md`](../features/ai-view-white-screen-monitor.md) 的 `schedule-trace`。不要再加首切专用探针。

---

## 已接受：第一次 present / 第一次调出 overlay

不是 `present` JS 热路径（`present-done` 仍是几毫秒）。

1. **每个尚未 `hasPresented` 的 AI**：load 完后 `visible=false`，点击才 `WasShown`。网络/文档可以早已结束；可见态首帧发生在点击当下，并可能和 SwitchAiBar 抢 GPU。
2. **冷启动第一次调出 SwitchAiBar**：`fv:first-overlay-show` 自己还有一次合成器首显。

二次切换同一 AI 已验证丝滑。跟手优先于消卡；默认 `backgroundThrottling` 保持开启。
