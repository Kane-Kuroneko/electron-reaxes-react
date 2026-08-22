# AI View：切后台闪白 —— 错误路径复盘

给下次改调度的人：先读现行架构 [`ai-view-foreground-white-flash.md`](./ai-view-foreground-white-flash.md)，再读本文，避免把已经证伪的补丁加回去。

关联：监控 [`ai-view-white-screen-monitor.md`](../features/ai-view-white-screen-monitor.md)；预加载首切 [`ai-view-first-present-warmup-postmortem.md`](./ai-view-first-present-warmup-postmortem.md)；overlay [`floating-view-missing-after-background.md`](./floating-view-missing-after-background.md)。

**用户直觉是对的**：浏览器切后台再回来不应闪。若「改调度器之后才闪」，优先查应用侧回前台逻辑，而不是长后台丢帧。

---

## 1. 时间线

| 阶段 | 行为 | 体感 |
|------|------|------|
| 调度器之前 | `focus/show/restore` 几乎只注册快捷键 | 不闪 |
| `afab9c78f` | 每个 window `focus` → `webContents.focus()`（electron#28163） | Alt-Tab 输入可用 |
| **`509a8e662`** | show/restore ensure；`backgroundThrottling:false`；关 `CalculateNativeWinOcclusion` | **开始稳定闪** |
| 其后 | `surfaceStale` + `invalidate` / ±1 / `capturePage` | 短切更闪 |
| `e9b0f0233` | 默认节流；拆除踢绘；restore/focus 仍动 WCV | Alt-Tab 好了；任务栏短切仍闪 |
| 2026-08-22 | 遮挡还原空操作 | 窗口化短切不闪；**最大化仍闪** |
| 同日 | `hasUsableBrowserWindowContent`：拒绝 0×0→1×1 | **最大化短切用户验证通过** |

---

## 2. 证伪过的补丁（禁止再加）

### A. `backgroundThrottling: false`

想让后台页「保活」。`false` + hide 会短路 `WasShown`（electron#42378）。hierarchy 完好也可以没帧。

### B. 踢绘（`invalidate` / bounds±1 / `capturePage`）

想在 WasShown 坏了之后「补一帧」。生产里 hierarchy 完好仍白屏；±1 让几乎每次 Alt-Tab 都 resize。`capturePage` 会踢 compositor，把真白屏掩盖成假修好。

### C. 关 `CalculateNativeWinOcclusion`

`509a8e662` 当修复打开。不能替代正确生命周期，也解释不了「只最大化闪」。现行 `electron.conf.ts` **不再**为此关这个 feature。

### D. 健康树上仍 `webContents.focus()` / `setBounds`

`attached∧visible∧bounds` ≠ 屏幕有帧。restore 后 5ms 的 window `focus` 上再 `focus()`，等于叠在 DWM 还原动画上（electron#28255）。50ms coalesce 只是把同一调用挪到 `focus` 事件，不是架构。

### E. 把 0×0 客户区写成 1×1

Windows 最大化后最小化会 `resize` + `getContentBounds()=0×0`。`fitWindow` 的 `Math.max(1,0)` 把中心 WCV 收到 1×1，还原拉满即闪近白衬底。窗口化最小化通常不走这条 resize。

---

## 3. 正确模型（摘要）

完整约束见架构文档。一句话：

> 产帧交给 Chromium WasHidden/WasShown；应用只修**破损 hierarchy**、只在**可用客户区**上对齐 layout、只在 **Alt-Tab** 还输入焦点。

---

## 4. Agent 决策树

```text
用户报告切后台闪白
│
├─ 刚改过 present / fitWindow / 节流 / 回前台 focus？
│   └─ 对照架构文档禁止项回滚
│
├─ 仅首次切到预加载 AI 卡/闪？
│   └─ first-present-warmup / preload park（另一件事）
│
├─ 仅 SwitchAiBar 消失？
│   └─ floating-view-missing-after-background
│
├─ 日志仍有 rebind / two-phase / invalidate / capturePage？
│   └─ 踢绘回归
│
├─ 任务栏短切仍有 restore-focus / focus-webContents？
│   └─ 遮挡还原不得还输入焦点
│
├─ 最大化 minimize 探针 snapshot.bounds 为 1×1？
│   └─ layout 源又吃了 0×0 客户区
│
├─ hierarchy-broken → present-recover？
│   └─ 查误 detach
│
└─ 读 %APPDATA%\ChatAIO\logs\white-screen-monitor.jsonl
    禁止用 remount / ±1 / 关节流「试一把」
```

---

## 5. 日志速查

```powershell
$log = "$env:APPDATA\ChatAIO\logs\white-screen-monitor.jsonl"
Select-String -Path $log -Pattern "rebind|two-phase|invalidate-after|focus-webContents|1,1|width.:1"
```

健康任务栏短切：`layout-noop` + `compositor-owned-noop`，无 `focus-webContents`；最大化 minimize 时 view bounds 保持全屏。
