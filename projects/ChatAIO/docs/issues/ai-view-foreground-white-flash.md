# AI View：从后台切回前台白屏闪烁

## 文档状态

- **症状**：Alt-Tab / 托盘唤回 / 反最小化后，当前 AI `WebContentsView` 白屏闪一帧。
- **状态**：ARCH FIXED（2026-08-09）——单一所有者 + 显式 mount 意图；去掉 reason 矩阵与 compositor 双重 hack。
- **历史**：`509a8e662` 把「踢绘」绑到每次 focus/show/restore，是闪白主因；后续补丁层曾叠加 ±1 bounds、二次 `addChildView`、全局反节流核按钮。

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
  L1 show|restore  hierarchy 完好 → 只 setBounds（若布局过期）+ focus
                 hierarchy 破损 → present('recover')
  hierarchy ≠ layout：bounds 过期不得升级为 switch remount
```

同步 AI 切换必须在 FloatingView `showInactive` **之前**调用 `present('switch')`（macOS remount 若落在 overlay 后会弄挂 SwitchAiBar）。

**reaction 时序陷阱（2026-08-10 修复）**：reaxes `obsReaction` 底层是 mobx `reaction`（无 scheduler），在 `setState` 的 action 结束时**同步**执行——早于 setState 之后的语句。命令式切换路径（setState → applyVisibility → present('switch')）若不抑制 store 兜底 reaction，兜底会先 remount 一次、显式调用再 remount 一次（darwin 双 remove+add，Win/Linux 二次 addChildView reorder）。修复：`setCenterStateForImperativeSwitch` 在 setState 期间置位抑制标志，兜底 reaction 直接跳过；调用方承诺随后同步 present('switch')。切换路径新增 setState 时**禁止**绕过该入口。

FloatingView 自身由独立的 overlay 呈现调度器管理（Windows 禁 hide()/show() 循环，用 setOpacity；stale 后 rebind + `invalidate()` 强制产帧）。见 [`floating-view-missing-after-background.md`](./floating-view-missing-after-background.md)。

---

## 2. Electron 约束（设计依据）

| 事实 | 含义 |
|------|------|
| `addChildView` 对已有子 view = reorder/native remount | 回前台对健康 view 调用 = 闪白 |
| electron#28163 | 回前台要 `webContents.focus()`，不要 remount |
| electron#42339 | Windows remount 抢焦点 |
| CalculateNativeWinOcclusion | 遮挡停绘；可关 feature，但不可替代正确生命周期 |
| ±1 `setBounds` / 二次 addChildView | 踢 WasShown 的 hack，与 remount 叠用必闪 |

---

## 3. 禁止事项

| 不要做 | 为什么 |
|--------|--------|
| 在 `applyVisibility` 里 `present` / `ensure` | 破坏单一所有者；FloatingView 时序难推理 |
| focus/show/restore 走 `present('switch')` | 健康 view 被 remount |
| 把 bounds 不一致当成 hierarchy 破损 | layout 问题用 setBounds |
| Darwin 上 remount **再** ±1 **再** addChildView | 双重 hack |
| `disable-renderer-backgrounding` 等进程级核按钮「补」闪白 | 烧电掩盖生命周期错误 |
| 新增 `CenterViewLifecycleReason` 布尔矩阵 | 用 `CenterMountIntent` 两种意图即可 |

---

## 4. 实现落点

| 模块 | 职责 |
|------|------|
| `Views/index.ts` | `presentActiveCenterView` / L0 / L1 / obsReaction Settings 兜底 / `setCenterStateForImperativeSwitch` 抑制入口 |
| `AI-Views/index.ts` | `applyVisibility` 仅 detach；`showAIView` / close 经抑制入口 setState 后调用 present |
| `electron.conf.ts` | 仅 `CalculateNativeWinOcclusion` + 各 view `backgroundThrottling:false` |

---

## 5. 验证矩阵

1. Alt-Tab 来回 → 无白闪；输入焦点可恢复  
2. 托盘 hide→show、最小化→还原 → 无白闪  
3. Ctrl+[/] 切换 AI → 置顶正确；SwitchAiBar 正常（尤其 macOS）  
4. Settings 开/关 → 层级正确  
5. 配置同步预加载其它 AI → 当前页不闪、不丢  
6. 切后台较久再回 → 切 AI 时 SwitchAiBar 仍出现（FloatingView 冷 promote）  
