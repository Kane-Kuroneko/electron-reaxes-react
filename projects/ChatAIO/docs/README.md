# ChatAIO 文档索引

子工程文档入口。改代码前按**症状**选文档，不要只搜文件名。

Agent 总览仍是 [`AGENTS.md`](../AGENTS.md)。本文只索引 `docs/`。

---

## 按症状（先看这里）

| 你遇到什么 | 先读 |
|------------|------|
| Alt-Tab / 托盘 hide→show / 最小化还原后中心 AI **闪白、白屏** | [`issues/ai-view-background-throttling-postmortem.md`](./issues/ai-view-background-throttling-postmortem.md) → [`issues/ai-view-foreground-white-flash.md`](./issues/ai-view-foreground-white-flash.md) |
| 冷启动**第一次**切到预加载 AI 卡顿；「切过去才加载」；想把后台页画暖 | [`issues/ai-view-first-present-warmup-postmortem.md`](./issues/ai-view-first-present-warmup-postmortem.md) → [`issues/ai-view-preload-first-switch-flash.md`](./issues/ai-view-preload-first-switch-flash.md) |
| 连点 Ctrl+[/] 卡片动画不跟手 | [`features/floating-view-rapid-switch-optimization.md`](./features/floating-view-rapid-switch-optimization.md) |
| 切后台一段时间再切 AI，SwitchAiBar **不见** | [`issues/floating-view-missing-after-background.md`](./issues/floating-view-missing-after-background.md) |
| Windows 拖 menubar 抖动 / 透明窗鼠标穿透 | [`issues/menubar-drag-investigation.md`](./issues/menubar-drag-investigation.md) |
| menubar 下方拖拽区挡住内容 | [`issues/menubar-drag-region-leak-below-content.md`](./issues/menubar-drag-region-leak-below-content.md) |
| Google AI Studio 登录 / passkey / Chrome 身份 | [`issues/google-ai-studio-electron-browser-identity.md`](./issues/google-ai-studio-electron-browser-identity.md) |
| 调度链日志怎么读（不踢绘） | [`features/ai-view-white-screen-monitor.md`](./features/ai-view-white-screen-monitor.md) |

**中心 WebContentsView / 预加载 / 节流** 改动前，按这个簇读完再写代码：

1. 节流复盘（Alt-Tab）
2. 单一所有者 + L0/L1
3. **第一次 present 暖机复盘（跟手优先，接受首切卡顿）**
4. v8 park 不变量
5. 白屏监控（只观察）

---

## architecture/ — 产品与运行时结构

| 文档 | 内容 |
|------|------|
| [`ai-config.md`](./architecture/ai-config.md) | AI 配置双层（用户项 / 运行时 view） |
| [`appearance-theme-environment.md`](./architecture/appearance-theme-environment.md) | 外观 / 主题注入 AI 页 |
| [`build-pipeline-and-dev-refresh.md`](./architecture/build-pipeline-and-dev-refresh.md) | 构建与 dev 热更新 |
| [`i18n.md`](./architecture/i18n.md) | 国际化 |
| [`main-view.md`](./architecture/main-view.md) | 主壳 / Main View |
| [`menubar-platform-paths.md`](./architecture/menubar-platform-paths.md) | 平台 menubar 路径 |
| [`custom-menu-view-prd.md`](./architecture/custom-menu-view-prd.md) | 自定义菜单 PRD |

---

## features/ — 已落地特性说明

| 文档 | 内容 |
|------|------|
| [`ai-page-switch-performance-optimization.md`](./features/ai-page-switch-performance-optimization.md) | 切换热路径 CPU / z-order；文末：接受第一次 present 卡顿 |
| [`ai-view-white-screen-monitor.md`](./features/ai-view-white-screen-monitor.md) | `white-screen-monitor.jsonl` 调度链 |
| [`floating-view-rapid-switch-optimization.md`](./features/floating-view-rapid-switch-optimization.md) | SwitchAiBar 连点 Interrupt & Redirect |
| [`floating-view-card-ux-optimization.md`](./features/floating-view-card-ux-optimization.md) | 切换卡片 UX |
| [`floating-view-swiper-migration.md`](./features/floating-view-swiper-migration.md) | Swiper 迁移 |
| [`focus-stealing-analysis.md`](./features/focus-stealing-analysis.md) | AI 页抢焦点 |
| [`prompt-view.md`](./features/prompt-view.md) | Prompt View 功能 |
| [`prompt-view-bugfix-and-ux.md`](./features/prompt-view-bugfix-and-ux.md) | Prompt 修复与 UX |
| [`prompt-view-visual-refresh.md`](./features/prompt-view-visual-refresh.md) | Prompt 视觉 |
| [`sensitive-region-access-blocking.md`](./features/sensitive-region-access-blocking.md) | 敏感地区访问阻断 |
| [`settings-exit-discard-and-prompt-scrollbar.md`](./features/settings-exit-discard-and-prompt-scrollbar.md) | Settings 退出丢弃 / 滚动条 |

---

## issues/ — 复盘、决策树、禁止项

| 文档 | 内容 |
|------|------|
| [`ai-view-background-throttling-postmortem.md`](./issues/ai-view-background-throttling-postmortem.md) | Alt-Tab 闪白：关节流 + 踢绘为什么错 |
| [`ai-view-foreground-white-flash.md`](./issues/ai-view-foreground-white-flash.md) | 现行 center view 生命周期 |
| [`ai-view-first-present-warmup-postmortem.md`](./issues/ai-view-first-present-warmup-postmortem.md) | **预加载暖不了可见态；接受首切卡顿** |
| [`ai-view-preload-first-switch-flash.md`](./issues/ai-view-preload-first-switch-flash.md) | 预加载 v1–v8 证伪与 park 不变量 |
| [`floating-view-missing-after-background.md`](./issues/floating-view-missing-after-background.md) | overlay 冷 reveal；Win 禁 hide/show 循环 |
| [`menubar-drag-investigation.md`](./issues/menubar-drag-investigation.md) | Windows `forward: true` 与拖拽冲突 |
| [`menubar-drag-region-leak-below-content.md`](./issues/menubar-drag-region-leak-below-content.md) | 拖拽区漏到内容下方 |
| [`google-ai-studio-electron-browser-identity.md`](./issues/google-ai-studio-electron-browser-identity.md) | AI Studio / Chrome 身份 |
| [`i18n-architecture-issues.md`](./issues/i18n-architecture-issues.md) | i18n 架构问题 |
| [`i18n-fixes.md`](./issues/i18n-fixes.md) | i18n 修复记录 |

---

## 其它

| 文档 | 内容 |
|------|------|
| [`modules/menu-label-width.md`](./modules/menu-label-width.md) | 菜单标签宽度 |
| [`feature-proposal--cross-instance-session-migration.md`](./feature-proposal--cross-instance-session-migration.md) | 跨实例会话迁移提案 |
| [`prompt-view-improvements.md`](./prompt-view-improvements.md) | Prompt 改进笔记 |
| [`prompt-view-redesign.md`](./prompt-view-redesign.md) | Prompt 重设计 |
| [`prompt-view-settings-fixes.md`](./prompt-view-settings-fixes.md) | Prompt / Settings 修复 |

子工程根目录还有 [`fixme.md`](../fixme.md)、[`todo.md`](../todo.md)。
