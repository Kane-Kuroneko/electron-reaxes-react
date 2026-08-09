# FloatingView：切后台一段时间后再切 AI，SwitchAiBar 不显示

## 文档状态

- **症状**：App 切后台较久（约 ≥5 分钟）再回前台，切换 AI 时 SwitchAiBar（FloatingView）不出现；点击 menubar（激活父窗）后才「回来」。
- **状态**：ARCH FIXED（2026-08-10）——overlay 呈现调度器：desired/actual 分离 + 平台化 conceal 策略；Windows 弃用 hide()/show() 循环。
- **历史**：2026-08-09 曾只修 z-order/bounds promote，无效——问题不在层级，在 **compositor 不再产帧**。
- **相关**：[`ai-view-foreground-white-flash.md`](./ai-view-foreground-white-flash.md)（中心 WCV）；[`menubar-drag-investigation.md`](./menubar-drag-investigation.md)（禁 `forward:true`）。

---

## 1. 根因（Electron 上游缺陷，非本项目时序 bug）

FloatingView 是 `transparent:true` + `backgroundThrottling:false` 的无框子窗，原模型在 `blur/hide/minimize` 时 `hide()`、要显示时 `showInactive()`。这个 hide↔show 循环踩中两个已知缺陷：

### 1a. FrameEvictor 失步（electron#42378）

`backgroundThrottling:false` 依赖 Electron 的 `disable_hidden.patch`，它把 `RenderWidgetHostImpl::WasHidden` 短路。窗口 `hide()` 后，Chromium 的 `FrameEvictionManager`（**5 分钟**定时器）驱逐 compositor frame；re-show 时 `WasShown → DelegatedFrameHost::WasShown → 产新帧` 这条路径又被同一个 patch 短路——**帧没了，也不会再生产**。

- 普通窗口：无帧 = 白屏（正是中心 WCV 白闪问题的同族根源）。
- **透明窗口：无帧 = 完全不可见**。`isVisible()===true`、`getOpacity()===1`，用户什么都看不到。

「一段时间」正好对应 5 分钟驱逐定时器；点 menubar 激活父窗迫使 DWM 重新合成，偶然救回。

### 1b. Windows 透明无框窗 hide()→show() 本身不可靠（electron#45730、#40830、#27265）

多个上游 issue 证实：透明窗二次 `show()` 后可能永不显示（表象同上）。社区公认解法就是**不要对透明 overlay 用 hide()/show()**：

```js
// electron#27265 的 workaround
hide  → win.setOpacity(0)   // 窗口保持 OS 可见
show  → win.setOpacity(1)
```

`setOpacity` 不改变 Chromium 的可见性状态 → 不触发 WasHidden/帧驱逐，也绕开透明窗 re-show 缺陷。

---

## 2. 目标架构：overlay 呈现调度器（必须遵守）

```text
desired  switchAiBarLayerActive        SwitchAiBar / GlobalMessage 是否应显示
actual   overlayRevealed               逻辑可见（禁止用 isVisible() 判断，见策略）
         overlaySurfaceStale           surface（bounds/层级/帧）是否可信

唯一调度入口 syncOverlayLayerVisibility
  ├─ desired=true  → reveal
  │     stale        → rebind：syncBounds + setAlwaysOnTop('floating')
  │     　　　　　      + showInactive(若 OS 不可见) + moveTop + webContents.invalidate()
  │     非 stale      → 轻量：showInactive(若需) / setOpacity(1)
  │     reveal 后一拍 verify：OS 拒绝显示 → rebind 重试一次
  └─ desired=false → conceal（平台策略）
        win32   『opacity』 setOpacity(0)，窗口永不 hide()
        darwin  『hide』    真实 hide()（否则透明层令主窗被 occlusion 节流，ca15e358c）
        linux   『hide』    setOpacity 不支持

父窗事件 → 只改 stale/desired 再走调度入口，不得直接操作窗口：
  focus / show / restore → stale=true；active 才 reveal
  blur / hide / minimize → stale=true；conceal

自愈：render-process-gone → reload → did-finish-load 重新 flush 命令队列 + 对齐可见性
warmup(win32)：boot 后 showInactive + opacity 0，窗口从此保持 OS 可见
```

关键点：

- **hierarchy/z-order 与「产帧」是两层问题**。promote（bounds/moveTop）只解决前者；帧被驱逐后必须 `webContents.invalidate()` 强制 compositor 重新提交。
- **`isVisible()` 在 opacity 策略下恒为 true**，逻辑可见性只能看 `overlayRevealed`。
- **verify 的覆盖范围**：`verifyOverlayRevealed` 只校验 OS 可见性（`isVisible()`），因此在 win32 opacity 策略下**几乎不会触发**（仅 owner-minimize 边缘），实际只覆盖 darwin/linux 的 hide 策略。Windows 的帧层面兜底完全依赖 rebind 中的 `invalidate()`——这是有意取舍（帧级探测需 capturePage，成本过高），不要误以为 Windows 有显示后验证。
- **win32 conceal 不置 stale**：opacity 0 期间 z-order 理论上可被第三方 alwaysOnTop 窗口越过且下次 reveal 不 rebind。跨应用切换必触发 blur/focus（均置 stale），残余风险仅限「应用保持前台期间出现第三方置顶窗」，接受不处理。
- perf 打点中 `needsPromote` 字段 = 本次 reveal 是否走了 rebind。

---

## 3. 禁止事项

| 反模式 | 原因 |
|--------|------|
| Windows 上对 FloatingView `hide()` 再 `show()/showInactive()` | electron#45730/#40830/#27265 + #42378，本 bug 根源 |
| 切后台时 `setBackgroundThrottling` 动态开关 | #42378 触发条件之一；只在创建时设一次 |
| 用 `isVisible()` 判断 overlay 逻辑可见 | opacity 策略下恒 true |
| `focus` 无条件 reveal | 透明层长期存在 → macOS occlusion 节流主窗 |
| 每次热切换 `moveTop`/`syncBounds` | 热路径 OS 开销；stale 门控已覆盖冷路径 |
| 绕过 `syncOverlayLayerVisibility` 直接摸窗口 | 破坏 desired/actual 单一调度 |

---

## 4. 调研引用

- [electron#42378](https://github.com/electron/electron/issues/42378) — backgroundThrottling:false + hidden → FrameEvictor 失步，~5min 后 blank
- [electron#45730](https://github.com/electron/electron/issues/45730) / [#40830](https://github.com/electron/electron/issues/40830) — 透明无框窗 hide→show 后不显示（opacity 表象正常）
- [electron#27265](https://github.com/electron/electron/issues/27265) — 透明窗延迟 show 缺陷 + setOpacity workaround（本方案采用）
- [electron#41276](https://github.com/electron/electron/issues/41276) — WCV 可见性切换不触发 `DelegatedFrameHost::WasShown`（同族：帧驱逐后不产帧）

---

## 5. 验证

1. 前台连续快捷键切 AI：SwitchAiBar 正常；热路径 perf `needsPromote:false`。
2. Alt-Tab 离开 **>6 分钟** 再回，立刻切 AI：SwitchAiBar 必须出现（帧驱逐场景，本 bug 主复现）。
3. 短暂 Alt-Tab（<2.1s 动画期内）再回：overlay 随 focus reveal 回来。
4. 最小化 / 托盘隐藏 >6 分钟再恢复后切 AI：同上。
5. Windows：任务管理器杀掉 FloatingView 渲染进程 → 下次切 AI 自动恢复。
6. macOS：透明层仍只在 SwitchAiBar 期间可见；焦点空窗期不遮挡主窗（occlusion 约束不回归）。
7. Windows：menubar 拖动仍丝滑（`forward:false` 不变）；opacity 0 时点击可正常穿透到下方内容。
