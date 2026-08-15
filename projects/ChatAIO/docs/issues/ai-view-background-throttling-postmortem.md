# AI View：切后台闪白 / 白屏 —— 复盘与 Agent 决策手册

## 文档状态

- **症状**：Alt-Tab / 托盘 hide→show / 最小化→还原后，中心 AI `WebContentsView` 闪白、偶发白屏；2026-08 某版起「几乎每次切后台再回来都闪」。
- **状态**：FIXED（2026-08-13，`e9b0f02`）——恢复 Electron **默认 `backgroundThrottling`**；回前台 **focus/bounds-only**；拆除 surface 踢绘层。
- **读者**：下次改 center view 调度、节流、监控的 agent / 开发者。**先读本文再动代码。**

### 关联文档（按阅读顺序）

| 文档 | 用途 |
|------|------|
| **本文** | 为什么错、怎么修、agent 决策树 |
| [`ai-view-foreground-white-flash.md`](./ai-view-foreground-white-flash.md) | 现行架构约束（单一所有者、L0/L1、禁止项） |
| [`ai-view-white-screen-monitor.md`](../features/ai-view-white-screen-monitor.md) | 调度链 JSONL 监控（只观察、不踢绘） |
| [`ai-view-preload-first-switch-flash.md`](./ai-view-preload-first-switch-flash.md) | 预加载 v1–v8 park |
| [`ai-view-first-present-warmup-postmortem.md`](./ai-view-first-present-warmup-postmortem.md) | 预加载暖不了可见态；接受第一次 present 卡顿 |
| [`floating-view-missing-after-background.md`](./floating-view-missing-after-background.md) | FloatingView overlay（opacity conceal，独立调度器） |

---

## 1. 用户直觉是对的

**浏览器切后台再切回来，不应闪白、不应白屏。** ChatAIO 中心 AI 页也应如此。

若「以前从不闪、改调度器后开始闪」，优先怀疑 **应用侧新加的回前台逻辑**，而不是「切后台这个动作天生有病」。

正常 Chromium 路径：

```text
窗口隐藏 → WasHidden → 合成器暂停/节流
窗口显示 → WasShown  → 合成器恢复产帧
```

ChatAIO 曾人为打断这条路径（见 §2），又在应用层用踢绘「补」——补法本身成了闪白来源。

---

## 2. 时间线与错误路径

### 2.1 早期（2026-08 前）

- 单一所有者 + `present(switch|recover)` 架构已建立（见 `ai-view-foreground-white-flash.md`）。
- 回前台 hierarchy 完好时：**只 focus**，最多 **setBounds**（同值则跳过）。
- 用户体感：**短切 Alt-Tab 通常不闪**。

### 2.2 错误方向 A：强制 `backgroundThrottling: false`

**动机**：希望 AI 页在后台仍「保活」、少被节流。

**设置位置（已全部撤回）**：

- `initWebContentsView.ts` — 所有 WCV
- `mainWindow.ts` — 壳 webContents
- `FloatingView` / `Main-View` dropdown 等

**后果（Electron 上游，非 ChatAIO 独有）**：

| Issue | 机制 |
|-------|------|
| [electron#42378](https://github.com/electron/electron/issues/42378) | `false` + hide/minimize → `disable_hidden.patch` 短路 `WasHidden`/`WasShown` → FrameEvictor 失步 |
| [electron#41276](https://github.com/electron/electron/issues/41276) | WCV 可见性切换不触发 `DelegatedFrameHost::WasShown`；帧驱逐后 hierarchy 仍「完好」 |

**关键认知**：`attached ∧ visible ∧ bounds 正确` **≠** 屏幕上有帧。日志可以显示「调度成功」，人眼仍白屏。

### 2.3 错误方向 B：surface 调度层 + 踢绘

在 A 的基础上又叠：

1. `blur/hide/minimize` → 标记 `surfaceStale`
2. 回前台 → `rebindCenterSurface`（`invalidate` / 两阶段 `setBounds ±1`）
3. 监控里 `capturePage`（早期）——**会踢 compositor 产帧，掩盖真问题**

**生产日志证据（v1.0.5）**：

- 57× `invalidate-after-stale`，hierarchy 始终完好，**用户仍白屏/闪白**
- 说明 **invalidate 不能替代 WasShown**

**两阶段 ±1 bounds 的副作用**：

- 每次 blur 都标 stale → **几乎每次 Alt-Tab 都 resize**
- 用户明确反馈：**以前从不闪，新调度器后稳定复现闪白**
- 这与「长后台丢帧」无关，是 **我们主动改尺寸** 导致的可见闪帧

### 2.4 正确修复（2026-08-13）

1. **删除** 所有 `backgroundThrottling: false`（用 Electron 默认 `true`）
2. **删除** center view 的 surface rebind / stale / 两阶段 bounds / invalidate 踢绘
3. **恢复** L0/L1：hierarchy 完好 → focus-only / bounds+focus；破损 → `present('recover')`
4. **保留** 调度链监控（`schedule-trace`，无 `capturePage`）——只观察，不修

用户验证：**Alt-Tab 恢复正常，无闪白。**

---

## 3. 架构模型（现行，必须遵守）

### 3.1 两层问题，两种修法

| 层 | 坏了的表现 | 正确修法 | 错误修法（会闪） |
|----|------------|----------|------------------|
| **hierarchy** | 未挂载 / 不可见 | `present('recover')` 补挂 | 对健康 view `present('switch')` remount |
| **layout** | bounds 错位 | `setBounds` | 把 layout 问题升级成 remount |
| **compositor 产帧** | 白屏但可点 | **默认节流 + Chromium WasShown** | ±1 / invalidate / capturePage 踢绘 |

**center view 不再单独维护 `surfaceStale` 状态机。** 产帧交给 Chromium；应用只做 hierarchy + layout + focus。

### 3.2 单一所有者（不变）

```text
applyVisibility     → 只 detach（+ 预加载 soft-hold，见 preload 文档）
present(switch)     → 换页 / Settings / 冷启动；允许平台 remount
present(recover)    → focus/show/restore 补挂；禁止 reorder
L0 focus            → hierarchy 完好 → webContents.focus()
L1 show/restore     → hierarchy 完好 → setBoundsIfChanged + focus
```

### 3.3 FloatingView 例外

FloatingView 是 **独立 overlay 调度器**（`overlaySurfaceStale` + opacity conceal），与 center WCV **不是同一套**。

- Windows：**禁止** overlay `hide()/show()` 循环 → 用 `setOpacity(0/1)`
- 现已恢复默认节流；冷 reveal 仍可能 `invalidate`（overlay 专用，勿抄到 center view）

---

## 4. Agent 决策树（遇到「切后台闪/白」时）

```text
用户报告 Alt-Tab / hide-show 闪白或白屏
│
├─ 是否刚改过 center view 回前台逻辑 / backgroundThrottling / rebind？
│   └─ 是 → 先读本文 + ai-view-foreground-white-flash.md，对照 §5 禁止项回滚
│
├─ 是否仅「首次切到预加载 AI」闪？
│   └─ 是 → 读 ai-view-preload-first-switch-flash.md（soft-hold / cover-handoff）
│
├─ 是否仅 SwitchAiBar 消失？
│   └─ 是 → 读 floating-view-missing-after-background.md（overlay 调度器）
│
├─ 日志 hierarchy 完好 + decision 含 rebind/two-phase/invalidate？
│   └─ 是 → 旧包或有人 reintroduce 踢绘；恢复 focus-only，不要加更多 kick
│
├─ 日志 hierarchy-broken → present-recover？
│   └─ 是 → 查 detach 路径 / Settings 开关 / applyVisibility 是否误 detach
│
└─ 仍无法解释
    ├─ 读 userData/logs/white-screen-monitor.jsonl（按 chainId + seq）
    ├─ 确认未开 capturePage / pixelProbe
    └─ 禁止用 remount 或 ±1「试一把」——先写日志结论再改
```

---

## 5. 禁止清单（违反即高概率回归）

| 禁止 | 原因 |
|------|------|
| 内容 WCV / mainWindow 设 `backgroundThrottling: false` | 打断 WasShown；#42378 |
| blur 后回前台默认 `invalidate` / ±1 / 两阶段 bounds | 稳定 Alt-Tab 闪白（已验证） |
| 监控默认 `capturePage` / pixelProbe | 踢绘，假修好 |
| focus/show/restore 走 `present('switch')` | 健康 view remount 闪白 |
| `applyVisibility` 内 `present` / ensure mount | 破坏单一所有者 |
| 用 `disable-renderer-backgrounding` 等核按钮「补」 | 烧电、掩盖生命周期错误 |
| 把 FloatingView overlay rebind 逻辑复制到 center view | 不同 surface 模型 |

---

## 6. 代码落点（2026-08-13 基线）

| 文件 | 职责 |
|------|------|
| `Views/index.ts` | `presentActiveCenterView`、L0/L1、window 事件、调度链埋点 |
| `AI-Views/index.ts` | `applyVisibility` 仅 detach；`setCenterStateForImperativeSwitch` |
| `initWebContentsView.ts` | **不设** `backgroundThrottling:false` |
| `mainWindow.ts` | 同上 |
| `FloatingView/index.ts` | overlay 调度器；默认节流 |
| `white-screen-monitor.retexel.ts` | schedule-trace JSONL |
| `electron.conf.ts` | `CalculateNativeWinOcclusion` 等；**不**叠核按钮 |

---

## 7. 验证矩阵

打包后必测：

1. Alt-Tab 来回 ×10 → **无闪白**，输入焦点可恢复  
2. 托盘 hide → show、最小化 → 还原 → **无闪白**  
3. Ctrl+[/] 切换 AI → 无多余 remount；SwitchAiBar 正常  
4. 预加载 AI 首次切换 → 无白闪（见 preload 文档）  
5. 日志 `%APPDATA%\ChatAIO\logs\white-screen-monitor.jsonl`：  
   - 应有 `hierarchy-ready→focus-only` / `bounds-focus-done`  
   - **不应**出现 `rebind-surface` / `two-phase-bounds-*` / `invalidate-after-stale`

---

## 8. 日志速查（给 agent）

```powershell
# 生产日志路径
$log = "$env:APPDATA\ChatAIO\logs\white-screen-monitor.jsonl"

# 最近回前台链
Get-Content $log | Select-Object -Last 30

# 若仍见踢绘决策 → 旧包或代码回归
Select-String -Path $log -Pattern "rebind|two-phase|invalidate-after"
```

**健康链示例**：

```text
blur              → background-marked
focus enter       → recover-after-focus
hierarchy-check   → hierarchy-ready→focus-only
restore-focus     → focus-webContents
exit              → focus-only-done
```

---

## 9. 教训摘要（一句话）

> **切后台不该闪——若闪，先看是不是我们关节流又在回前台踢绘；正确做法是像浏览器一样交给 Chromium 的 WasHidden/WasShown，应用只做 mount/layout/focus。**

---

## 10. 变更历史

| 日期 | 变更 |
|------|------|
| 2026-08-09 | 单一所有者 + L0/L1 架构文档 |
| 2026-08-12 | 误加 surface rebind + 强制 false 节流 |
| 2026-08-13 | 恢复默认节流；拆除 center surface 踢绘；用户验证通过 |
| 2026-08-13 | 本文档 + skill 索引 |
