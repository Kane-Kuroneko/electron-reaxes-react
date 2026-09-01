# ChatAIO

全仓库不变量见仓库根 [AGENTS.md](../../AGENTS.md)，本文不重复。

`CLAUDE.md`、`DOCS.md` 指向本文件。issue / 设计 / 复盘都在 `docs/`；**本文只做索引**。新文档加到下面对应条目，不要写进根 `AGENTS.md`。

新增功能先读 [设计文档与关键注释](./docs/agent/feature-design-and-comments.md)。架构摘要：[ChatAIO 架构](../../.agents/rules/chat-aio-architecture.md)。

`docs/README.md` 只指向本文，不在 `docs/` 里再维护一份总目录。

## 按任务 / 症状

### 中心 AI 页闪白、回前台

- [现行生命周期](./docs/issues/ai-view-foreground-white-flash.md)
- [已经证伪的修法](./docs/issues/ai-view-background-throttling-postmortem.md)（关节流 / 踢绘 / Occlusion / 1×1）
- [白屏监控（只观察）](./docs/features/ai-view-white-screen-monitor.md)

### 第一次切到预加载 AI 卡顿

- [暖机复盘](./docs/issues/ai-view-first-present-warmup-postmortem.md)（跟手优先，接受首切卡顿）
- [预加载 v1–v8 与 park 不变量](./docs/issues/ai-view-preload-first-switch-flash.md)

### Switch AI / 浮层卡片

- [连点 Ctrl+[/] 动画不跟手](./docs/features/floating-view-rapid-switch-optimization.md)
- [切后台后再切 AI，SwitchAiBar 不见](./docs/issues/floating-view-missing-after-background.md)
- [拖拽排序、顺序写盘](./docs/features/ai-list-reorder.md)
- [Manage AIs 表格展示序 / 筛选](./docs/features/manage-ais-table-ux.md)
- [卡片 UX](./docs/features/floating-view-card-ux-optimization.md)、[Swiper 迁移](./docs/features/floating-view-swiper-migration.md)
- [切换热路径](./docs/features/ai-page-switch-performance-optimization.md)

### menubar / 透明窗

- [Windows 拖 menubar 抖动](./docs/issues/menubar-drag-investigation.md)（禁止 `forward: true`）
- [拖拽区漏到内容下方](./docs/issues/menubar-drag-region-leak-below-content.md)
- [平台 menubar 路径](./docs/architecture/menubar-platform-paths.md)

### 登录 / 身份 / 代理

- [Google AI Studio / Chrome 身份](./docs/issues/google-ai-studio-electron-browser-identity.md)
- [AI 配置双层](./docs/architecture/ai-config.md)
- [敏感地区访问阻断](./docs/features/sensitive-region-access-blocking.md)

### Prompt / Settings / 外观

- [Prompt View](./docs/features/prompt-view.md)、[bugfix 与 UX](./docs/features/prompt-view-bugfix-and-ux.md)、[视觉](./docs/features/prompt-view-visual-refresh.md)
- [Settings 退出丢弃 / 滚动条](./docs/features/settings-exit-discard-and-prompt-scrollbar.md)
- [Manage AIs 表格展示序 / 筛选](./docs/features/manage-ais-table-ux.md)
- [外观 / 主题](./docs/architecture/appearance-theme-environment.md)、[i18n](./docs/architecture/i18n.md)

### 换图标

- [图标布局 `statics/icons/`](./docs/architecture/app-icons.md)
- 仓库根 [替换 App / Tray 图标](../../scripts/replace-app-icons/AGENTS.md)（不要手改 `.ico` / `.icns`）

硬约束见上表对应 `docs/issues`（尤其是回前台闪白、menubar 拖拽），不要把禁止项再抄进本文。

## 按目录翻

### architecture/

| 文档 | 内容 |
|------|------|
| [ai-config.md](./docs/architecture/ai-config.md) | AI 配置双层（用户项 / 运行时 view） |
| [app-icons.md](./docs/architecture/app-icons.md) | `statics/icons/` 应用/托盘/母图；打包排除母图 |
| [appearance-theme-environment.md](./docs/architecture/appearance-theme-environment.md) | 外观 / 主题注入 AI 页 |
| [build-pipeline-and-dev-refresh.md](./docs/architecture/build-pipeline-and-dev-refresh.md) | 构建与 dev 热更新 |
| [i18n.md](./docs/architecture/i18n.md) | 国际化 |
| [main-view.md](./docs/architecture/main-view.md) | 主壳 / Main View |
| [menubar-platform-paths.md](./docs/architecture/menubar-platform-paths.md) | 平台 menubar 路径 |
| [custom-menu-view-prd.md](./docs/architecture/custom-menu-view-prd.md) | 自定义菜单 PRD |

### features/

| 文档 | 内容 |
|------|------|
| [ai-list-reorder.md](./docs/features/ai-list-reorder.md) | Switch AI / Manage AIs 立即持久化排序 |
| [manage-ais-table-ux.md](./docs/features/manage-ais-table-ux.md) | Manage AIs 未启用置底、启用槽位拖拽、列筛选进 reaxel、空表不拆筛选浮层 |
| [ai-page-switch-performance-optimization.md](./docs/features/ai-page-switch-performance-optimization.md) | 切换热路径 CPU / z-order |
| [ai-view-white-screen-monitor.md](./docs/features/ai-view-white-screen-monitor.md) | `white-screen-monitor.jsonl` 调度链 |
| [floating-view-rapid-switch-optimization.md](./docs/features/floating-view-rapid-switch-optimization.md) | SwitchAiBar 连点 Interrupt & Redirect |
| [floating-view-card-ux-optimization.md](./docs/features/floating-view-card-ux-optimization.md) | 切换卡片 UX |
| [floating-view-swiper-migration.md](./docs/features/floating-view-swiper-migration.md) | Swiper 迁移 |
| [focus-stealing-analysis.md](./docs/features/focus-stealing-analysis.md) | AI 页抢焦点 |
| [prompt-view.md](./docs/features/prompt-view.md) | Prompt View |
| [prompt-view-bugfix-and-ux.md](./docs/features/prompt-view-bugfix-and-ux.md) | Prompt 修复与 UX |
| [prompt-view-visual-refresh.md](./docs/features/prompt-view-visual-refresh.md) | Prompt 视觉 |
| [sensitive-region-access-blocking.md](./docs/features/sensitive-region-access-blocking.md) | 敏感地区访问阻断 |
| [settings-exit-discard-and-prompt-scrollbar.md](./docs/features/settings-exit-discard-and-prompt-scrollbar.md) | Settings 退出丢弃 / 滚动条 |

### issues/

| 文档 | 内容 |
|------|------|
| [ai-view-background-throttling-postmortem.md](./docs/issues/ai-view-background-throttling-postmortem.md) | 闪白错误路径 |
| [ai-view-foreground-white-flash.md](./docs/issues/ai-view-foreground-white-flash.md) | 现行中心 WCV 回前台生命周期 |
| [ai-view-first-present-warmup-postmortem.md](./docs/issues/ai-view-first-present-warmup-postmortem.md) | 预加载暖不了可见态 |
| [ai-view-preload-first-switch-flash.md](./docs/issues/ai-view-preload-first-switch-flash.md) | 预加载 v1–v8 与 park |
| [floating-view-missing-after-background.md](./docs/issues/floating-view-missing-after-background.md) | overlay 冷 reveal |
| [menubar-drag-investigation.md](./docs/issues/menubar-drag-investigation.md) | Windows `forward: true` |
| [menubar-drag-region-leak-below-content.md](./docs/issues/menubar-drag-region-leak-below-content.md) | 拖拽区漏到内容下方 |
| [google-ai-studio-electron-browser-identity.md](./docs/issues/google-ai-studio-electron-browser-identity.md) | AI Studio / Chrome 身份 |
| [i18n-architecture-issues.md](./docs/issues/i18n-architecture-issues.md) | i18n 架构问题 |
| [i18n-fixes.md](./docs/issues/i18n-fixes.md) | i18n 修复记录 |

### 其它

| 文档 | 内容 |
|------|------|
| [feature-design-and-comments.md](./docs/agent/feature-design-and-comments.md) | 新增功能：设计文档 + 关键注释 |
| [menu-label-width.md](./docs/modules/menu-label-width.md) | 菜单标签宽度 |
| [feature-proposal--cross-instance-session-migration.md](./docs/feature-proposal--cross-instance-session-migration.md) | 跨实例会话迁移提案 |
| [prompt-view-improvements.md](./docs/prompt-view-improvements.md) | Prompt 改进笔记 |
| [prompt-view-redesign.md](./docs/prompt-view-redesign.md) | Prompt 重设计 |
| [prompt-view-settings-fixes.md](./docs/prompt-view-settings-fixes.md) | Prompt / Settings 修复 |
| [fixme.md](./fixme.md) | 问题清单（P0–P3） |
| [todo.md](./todo.md) | 待办 |
