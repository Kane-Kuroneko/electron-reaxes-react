# 中心 WebContentsView：回前台生命周期

现行架构。改 `present` / `fitWindow` / window `focus|show|restore|resize` / 节流 之前必读。

预加载第一次 present 卡顿是另一件事：[`ai-view-first-present-warmup-postmortem.md`](./ai-view-first-present-warmup-postmortem.md)。  
错误路径与决策树：[`ai-view-background-throttling-postmortem.md`](./ai-view-background-throttling-postmortem.md)。  
调度链日志：[`ai-view-white-screen-monitor.md`](../features/ai-view-white-screen-monitor.md)。

---

## 1. 不变量

```text
reaxel_AIViews.applyVisibility     → 只 detach / park，不 mount
Reaxel_View.presentActiveCenterView
  ├─ switch   换页 / Settings / 冷启动（允许平台 remount）
  └─ recover  仅 hierarchy 破损时补挂（禁止 reorder）

窗口生命周期 ≠ 产帧所有者
  健康遮挡还原（任务栏 / 托盘）→ 空操作，交给 Chromium WasShown
  Alt-Tab（窗口一直可见）    → 最多还一次输入焦点（electron#28163）

layout 源 = 可用客户区
  未最小化 且 getContentBounds() 两边 ≥ 32px
  禁止把 Windows 最大化最小化时的 0×0 写成 WCV 1×1

节流 = Electron 默认 backgroundThrottling（true）
  禁止 false；禁止 ±1 / invalidate / capturePage 踢绘
```

命令式换页必须走 `setCenterStateForImperativeSwitch`，随后**同步** `present('switch')`（在 FloatingView `showInactive` 之前）。reaxes `obsReaction` 在 `setState` 的 action 结束时同步跑，不抑制会双重 remount。

---

## 2. 回前台状态机

`occludedResumePending`：minimize / hide / 最小化时的 blur / restore 置位；只在下一次 window `focus` 消费。遮挡周期里的假 blur 清不掉它。

| 事件 | hierarchy 破了 | hierarchy 完好 |
|------|----------------|----------------|
| `minimize` / `hide` | 只卸快捷键 + 监控 | 同左；**不碰 WCV** |
| `restore` / `show` | `present('recover')` | 客户区可用才 `setBoundsIfChanged`；**禁止 `webContents.focus()`** |
| `focus`（遮挡还原） | `present('recover')` | **`compositor-owned-noop`**，禁止 focus |
| `focus`（Alt-Tab） | `present('recover')` | 中心未持焦才 `webContents.focus()` |
| `resize` / `fitWindow` | — | 客户区不可用则 **整段 return**，保持上一帧 bounds |

任务栏短切实际链（生产已验证）：

```text
minimize → restore（~0–10ms）→ window focus
健康时：layout-noop + compositor-owned-noop
整链不得出现 restore-focus / focus-webContents
```

Alt-Tab（窗口未最小化）允许 `hierarchy-ready→input-focus`。托盘 / 任务栏还原后键盘焦点可能仍在 menubar 壳，要点一下内容区（electron#28255：还原动画里 focus 会闪）。

---

## 3. Layout 源：坍缩客户区不是布局

Windows 把**已最大化**窗口最小化时，会先 `resize` 并把 `getContentBounds()` 报成 `0×0`（坐标落到 `-17061` 一类占位）。若此时 `Math.max(1, 0)` 写入中心 WCV，view 变成 **1×1**；还原最大化再拉满，DWM 第一帧就是近白衬底（`#F5F6F8`）。

**窗口化**最小化通常不发这条 resize，WCV 保持原尺寸，所以不闪。

门闩：`hasUsableBrowserWindowContent`（`usable-window-content.utility.ts`）。所有从客户区推导 bounds 的路径共用：

- `Reaxel_View.fitWindow`
- `clipMainShellToMenuBar`
- Prompt `syncBounds`
- FloatingView overlay `syncBounds`

日志判定：最大化后 minimize 探针的 `snapshot.bounds` **必须仍是全屏**，不得为 `1×1`。

---

## 4. Electron 约束

| 事实 | 含义 |
|------|------|
| `addChildView` 对已有子 view = reorder | 回前台对健康 view 调用 = 闪白 |
| electron#28163 | Alt-Tab 后焦点常落在 menubar 壳 |
| electron#28255 | 还原动画期间 `webContents.focus()` 会白屏 |
| electron#42339 | Windows remount 抢焦点 |
| electron#42378 | `backgroundThrottling:false` + hide 短路 WasShown |
| `attached∧visible∧bounds` ≠ 屏幕有帧 | 健康短切去 setBounds / focus 会打出近白衬底 |

Chromium flag、改衬底色、关节流 **都不是** 这条问题的修复。

---

## 5. 禁止

| 不要做 | 为什么 |
|--------|--------|
| `applyVisibility` 里 `present` / ensure | 破坏单一所有者 |
| focus/show/restore 走 `present('switch')` | 健康 view remount |
| 遮挡还原上 `webContents.focus()` | 叠在 DWM 上必闪 |
| 50ms coalesce 仍 focus | 只是把 focus 挪到 5ms 后的 `focus` 事件 |
| ±1 / invalidate / `capturePage` 踢绘 | 短切稳定闪白 |
| `backgroundThrottling: false` | 打断 WasShown |
| `disable-renderer-backgrounding` / 关 `CalculateNativeWinOcclusion` 当修复 | 核按钮；`509a8e662` 开过 Occlusion 开关，无效且污染架构 |
| 最小化 / 0×0 上 `fitWindow` → 1×1 | 最大化还原必闪 |
| 把 FloatingView overlay rebind 抄到中心 WCV | 不同 surface 模型 |
| 新增 `CenterViewLifecycleReason` 布尔矩阵 | 两种 `CenterMountIntent` 即可 |

---

## 6. 落点

| 模块 | 职责 |
|------|------|
| `Views/index.ts` | `present`；`occludedResumePending`；`fitWindow` / `setViewBoundsIfChanged` 拒绝坍缩客户区 |
| `usable-window-content.utility.ts` | layout 源门闩 |
| `clip-main-shell-to-menubar.utility.ts` / Prompt / FloatingView | 同样拒绝 0×0 |
| `AI-Views/index.ts` | `applyVisibility` 只 detach |
| `initWebContentsView.ts` / `mainWindow.ts` | 不设 `backgroundThrottling:false` |
| `electron.conf.ts` | **不**为闪白关 Occlusion / 关节流 |

---

## 7. 验证

1. 窗口化任务栏短切 → 无白闪；`compositor-owned-noop`；无 `focus-webContents`
2. **最大化**后再短切 → 无白闪；minimize 时 WCV bounds ≠ `1×1`
3. Alt-Tab → 无白闪；输入焦点可恢复
4. 托盘 hide→show → 无白闪
5. Ctrl+[/] 换 AI、Settings 开/关 → 层级正确
6. 预加载 AI 首次切换无白闪（park）；第一次 present 卡顿是接受项
7. 长后台再切 AI，SwitchAiBar 仍在（FloatingView 冷 promote）

---

## 8. 提交史（为什么调度器有锅）

| 提交 | 做了什么 | 结果 |
|------|----------|------|
| 调度器之前 | `focus/show/restore` 几乎只注册快捷键 | 不闪 |
| `afab9c78f` | 每个 window `focus` 上 `webContents.focus()`（#28163） | Alt-Tab 输入可用；任务栏还原也会打到 |
| **`509a8e662`** | 自称 stop resume flash：show/restore ensure、关节流、关 Occlusion | **分水岭，开始闪** |
| 其后踢绘层 | blur stale、`invalidate`、±1、`capturePage` | 短切更闪 |
| `e9b0f0233` | 恢复默认节流，拆踢绘 | Alt-Tab 好了；restore/focus 仍动 WCV |
| 2026-08-22 | 遮挡还原空操作 + 拒绝 0×0 layout 源 | 最大化短切用户验证通过 |
