# AI View：从后台切回前台白屏闪烁

## 文档状态

- **症状**：Alt-Tab / 托盘唤回 / 反最小化后，当前 AI `WebContentsView` 闪白或白屏。
- **状态**：ARCH FIXED（2026-08-13）——单一所有者 + **默认 `backgroundThrottling`**；回前台 hierarchy 完好只 focus / 对齐 bounds，禁止踢绘。
- **历史**：`509a8e662` 把「踢绘」绑到每次 focus/show/restore，是闪白主因；强制 `backgroundThrottling:false` 后曾叠加 invalidate / 两阶段 ±1 rebind，短切后台反而稳定闪白，已撤回。
- **复盘**：见 [`ai-view-background-throttling-postmortem.md`](./ai-view-background-throttling-postmortem.md)（agent 决策树、禁止项、日志速查）。预加载第一次 present 卡顿是另一件事，见 [`ai-view-first-present-warmup-postmortem.md`](./ai-view-first-present-warmup-postmortem.md)。文档索引：[`docs/README.md`](../README.md)。

---

## 1. 目标架构（必须遵守）

```text
reaxel_AIViews.applyVisibility
  └─ 只 detach：谁不该留在中心区
       │
Reaxel_View.presentActiveCenterView(intent)
  └─ 唯一 mount / promote 入口
       ├─ intent = 'switch'   AI换页 / Settings / 冷启动
       │    Darwin: remove+add（唯一 compositor 恢复手段）
       │    Win/Linux: addChildView 置顶（切换必要代价）
       │    禁止 bounds±1，禁止二次 addChildView
       └─ intent = 'recover'  focus / show / restore 破损补挂
            未挂载才 addChildView；已挂载绝不 reorder
            setVisible / setBounds；禁止 remount

回前台分层：
  L0 focus   hierarchy 完好 → 只 webContents.focus()
  L1 show|restore  hierarchy 完好 → setBounds（若布局过期）+ focus
                 hierarchy 破损 → present('recover')
  hierarchy ≠ layout：bounds 过期不得升级为 switch remount

节流：
  内容 WCV / mainWindow 使用 Electron 默认 backgroundThrottling（true）
  走正常 WasHidden / WasShown，与浏览器一致；禁止再关节流后靠踢绘「补」
```

同步 AI 切换必须在 FloatingView `showInactive` **之前**调用 `present('switch')`（macOS remount 若落在 overlay 后会弄挂 SwitchAiBar）。

**reaction 时序陷阱（2026-08-10 修复）**：reaxes `obsReaction` 底层是 mobx `reaction`（无 scheduler），在 `setState` 的 action 结束时**同步**执行——早于 setState 之后的语句。命令式切换路径（setState → applyVisibility → present('switch')）若不抑制 store 兜底 reaction，兜底会先 remount 一次、显式调用再 remount 一次（darwin 双 remove+add，Win/Linux 二次 addChildView reorder）。修复：`setCenterStateForImperativeSwitch` 在 setState 期间置位抑制标志，兜底 reaction 直接跳过；调用方承诺随后同步 present('switch')。切换路径新增 setState 时**禁止**绕过该入口。

FloatingView 自身由独立的 overlay 呈现调度器管理（Windows 禁 hide()/show() 循环，用 setOpacity）。见 [`floating-view-missing-after-background.md`](./floating-view-missing-after-background.md)。

---

## 2. Electron 约束（设计依据）

| 事实 | 含义 |
|------|------|
| `addChildView` 对已有子 view = reorder/native remount | 回前台对健康 view 调用 = 闪白 |
| electron#28163 | 回前台要 `webContents.focus()`，不要 remount |
| electron#42339 | Windows remount 抢焦点 |
| CalculateNativeWinOcclusion | 遮挡停绘；可关 feature，但不可替代正确生命周期 |
| `backgroundThrottling:false` + hide | electron#42378：WasShown 短路，易丢帧；应用侧再 ±1/invalidate 会闪 |

---

## 3. 禁止事项

| 不要做 | 为什么 |
|--------|--------|
| 在 `applyVisibility` 里 `present` / `ensure` | 破坏单一所有者；FloatingView 时序难推理 |
| focus/show/restore 走 `present('switch')` | 健康 view 被 remount |
| 把 bounds 不一致当成 hierarchy 破损 | layout 问题用 setBounds |
| Darwin 上 remount **再** ±1 **再** addChildView | 双重 hack |
| 热路径每次 focus 做 ±1 / invalidate 踢绘 | 短切闪白 |
| 内容 view 强制 `backgroundThrottling:false` 再靠踢绘补 | 南辕北辙 |
| `disable-renderer-backgrounding` 等进程级核按钮「补」闪白 | 烧电掩盖生命周期错误 |
| 新增 `CenterViewLifecycleReason` 布尔矩阵 | 用 `CenterMountIntent` 两种意图即可 |

---

## 4. 实现落点

| 模块 | 职责 |
|------|------|
| `Views/index.ts` | `presentActiveCenterView` / L0 focus-only / L1 bounds+focus / Settings 兜底 |
| `AI-Views/index.ts` | `applyVisibility` 仅 detach；`showAIView` / close 经抑制入口 setState 后调用 present |
| `initWebContentsView.ts` / `mainWindow.ts` | 默认节流（不设 `backgroundThrottling:false`） |
| `electron.conf.ts` | 仅 `CalculateNativeWinOcclusion` |

运行时证据（调度链追踪、默认无 `capturePage`）：见 [`ai-view-white-screen-monitor.md`](../features/ai-view-white-screen-monitor.md)。

---

## 5. 验证矩阵

1. Alt-Tab 来回 → 无白闪；输入焦点可恢复  
2. 托盘 hide→show、最小化→还原 → 无白闪  
3. Ctrl+[/] 切换 AI → 置顶正确；SwitchAiBar 正常（尤其 macOS）  
4. Settings 开/关 → 层级正确  
5. 配置同步预加载其它 AI → 当前页不闪、不丢；**首次切到预加载 AI 无白闪**（park 见 [`ai-view-preload-first-switch-flash.md`](./ai-view-preload-first-switch-flash.md)）。第一次 present 的合成卡顿是接受项，见 [`ai-view-first-present-warmup-postmortem.md`](./ai-view-first-present-warmup-postmortem.md)  
6. 切后台较久再回 → 切 AI 时 SwitchAiBar 仍出现（FloatingView 冷 promote）  
