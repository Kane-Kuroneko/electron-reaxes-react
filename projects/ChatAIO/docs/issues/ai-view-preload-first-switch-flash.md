# AI View：开启 Preload 后首次切换闪烁

## 文档状态

- **症状**：`preloadOnStartup` 开启时，冷启动后第一次切换到预加载 AI 有明显闪烁/白屏感；同一 AI 一旦展示过，之后再切则丝滑。
- **状态**：FIXED（2026-08-13）——未首展页 soft-hold + 首次 switch 用上一中心页 cover-handoff。
- **关联**：[`ai-view-foreground-white-flash.md`](./ai-view-foreground-white-flash.md)（回前台闪白，根因不同）。

---

## 1. 根因

旧链路把「预加载」只做成了 `loadURL`，没有完成「可无闪切换」所需的 compositor 暖机：

```text
syncAIViewsWithConfig
  → initAIView（addChildView + setVisible(false) + loadURL）
  → applyVisibility → removeChildView（硬 detach）
  → 网络 load 在 detach 状态下完成，ready=true，但无可用帧缓冲

用户首次切到该 AI
  → present('switch')：detach 旧页 → addChildView 新页 + setVisible(true)
  → 新页首次产帧前露出主窗/空缓冲 → 闪烁

再次切换
  → 该页已 hasPresented，帧缓冲仍在 → 丝滑
```

社区同类结论：

- Electron [#47351](https://github.com/electron/electron/issues/47351) / [#43293](https://github.com/electron/electron/issues/43293)：未完成首绘的 `WebContentsView` 无法稳定盖住已加载 view。
- Canopy `PortalManager`：闲置 tab **不** `removeChildView`，改 offscreen park，避免 detach/reattach 丢状态与首帧。

`ready`（`did-stop-loading`）只表示导航结束，**不等于**已有可展示帧。旧代码也未用 `ready`/`hasPresented` 门禁切换。

---

## 2. 修复策略

| 机制 | 行为 |
|------|------|
| `RuntimeAIView.hasPresented` | 是否曾作为中心页成功 present |
| soft-hide（未首展） | 闲置预加载页只 `setVisible(false)`，保持挂在 `contentView`，允许 hierarchy 内暖机 |
| 硬 detach（已首展） | 与原架构一致，闲置页 `removeChildView` |
| cover-handoff | 切到 `!hasPresented` 时：目标插到上一中心页**下方**并可见 → 等 load/双 rAF → promote 目标 → 再 detach 其它 |

`presentActiveCenterView` 仍是唯一 mount 所有者；handoff 只扩展 `switch` 的首展路径，不改回前台 `recover`。

---

## 3. 落点

| 文件 | 变更 |
|------|------|
| `AI-Views/index.ts` | `hasPresented`；`applyVisibility` 对未首展 soft-hide |
| `Views/index.ts` | `softHideInactiveCenterView`；`detachOtherCenterViews` 区分；preload cover-handoff |

---

## 4. 验证矩阵

1. 多个 AI 勾选 Preload → 冷启动 → 首次 Ctrl+[/] 切到预加载 AI → **无**明显白闪  
2. 同一 AI 再切走切回 → 仍丝滑  
3. 未 preload、懒创建后首次进入 → 可接受加载态（无旧页可盖时不走 handoff）  
4. Settings 开/关、回前台 → 不回归 [`ai-view-foreground-white-flash.md`](./ai-view-foreground-white-flash.md)  
5. macOS SwitchAiBar / FloatingView 时序：handoff 仍在 FloatingView `showInactive` 之前启动（同步 arm，异步 promote）
