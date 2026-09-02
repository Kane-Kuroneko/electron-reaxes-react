# ChatAIO

全仓库不变量见仓库根 [AGENTS.md](../../AGENTS.md)，本文不重复。

`CLAUDE.md`、`DOCS.md` 指向本文件。issue / 设计 / 复盘都在 `docs/`；**本文只做索引**。新文档加到下面对应条目，不要写进根 `AGENTS.md`。

新增功能先读 [设计文档与关键注释](./docs/agent/feature-design-and-comments.md)。架构摘要：[ChatAIO 架构](../../.agents/rules/chat-aio-architecture.md)。

路径别名：`#shared/*` → `src/shared/*`（共享数据/类型层）。跨目录不要写 `../../../shared/...`，也不要新增 `#src/shared/...`。

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
- [中区 Current AI 下拉切换](./docs/features/menubar-current-ai-dropdown.md)
- [卡片 UX](./docs/features/floating-view-card-ux-optimization.md)、[Swiper 迁移](./docs/features/floating-view-swiper-migration.md)
- [切换热路径](./docs/features/ai-page-switch-performance-optimization.md)

### menubar / 透明窗

- [冷启动 menubar 白屏检测器](./docs/features/menubar-cold-start-monitor.md)（Phase 5 等 visual-ready，不是 menu-view:ready）
- [Windows 拖 menubar 抖动](./docs/issues/menubar-drag-investigation.md)（禁止 `forward: true`）
- [拖拽区漏到内容下方](./docs/issues/menubar-drag-region-leak-below-content.md)
- [平台 menubar 路径](./docs/architecture/menubar-platform-paths.md)
- [中区 Current AI 下拉切换](./docs/features/menubar-current-ai-dropdown.md)

### 登录 / 身份 / 代理

- [升级后登录全丢](./docs/issues/ai-login-session-lost-after-catalog-uuid.md)（站点 `Set-Cookie` 覆盖旧分区；不是安装器清空）
- [提案：升级前备份 / 升级后还原 session](./docs/feature-proposal--update-session-backup.md)
- [Google AI Studio / Chrome 身份](./docs/issues/google-ai-studio-electron-browser-identity.md)
- [AI 配置双层](./docs/architecture/ai-config.md)
- [提案：AI 供应商目录单一事实源（分批；目录 ≠ 用户页实例）](./docs/feature-proposal--ai-catalog-source.md)
- [Settings 手动检查 AI 目录](./docs/features/ai-catalog-manual-update.md)（检查中无限 loading / 侧栏锁死：不要 await 内存 session 的 clearCache）
- [敏感地区访问阻断](./docs/features/sensitive-region-access-blocking.md)

### Prompt / Settings / 外观

- [Prompt View](./docs/features/prompt-view.md)、[bugfix 与 UX](./docs/features/prompt-view-bugfix-and-ux.md)、[视觉](./docs/features/prompt-view-visual-refresh.md)
- [Settings 退出丢弃 / 滚动条](./docs/features/settings-exit-discard-and-prompt-scrollbar.md)
- [Settings 首次打开延迟（预加载晚于 AI 页）](./docs/features/settings-view-preload.md)
- [Settings 切 Manage AIs 卡顿埋点](./docs/features/settings-menu-switch-perf.md)
- [Manage AIs 表格展示序 / 筛选](./docs/features/manage-ais-table-ux.md)
- [外观 / 主题](./docs/architecture/appearance-theme-environment.md)、[i18n](./docs/architecture/i18n.md)

### E2E

- [Playwright E2E 框架](./docs/features/e2e-playwright.md)（`yarn test:e2e`；隔离 userData；不测远程 AI DOM）

### 换图标

- [图标布局 `statics/icons/`](./docs/architecture/app-icons.md)
- 仓库根 [替换 App / Tray 图标](../../scripts/replace-app-icons/AGENTS.md)（不要手改 `.ico` / `.icns`）

硬约束见上表对应 `docs/issues`（尤其是回前台闪白、menubar 拖拽），不要把禁止项再抄进本文。

## 按目录翻

### architecture/

| 文档 | 内容 |
|------|------|
| [ai-config.md](./docs/architecture/ai-config.md) | 供应商目录 / 用户页实例；目标模型见下方提案 |
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
| [menubar-cold-start-monitor.md](./docs/features/menubar-cold-start-monitor.md) | 冷启动 menubar 白屏 vs 当前 WCV 加载时序 |
| [ai-list-reorder.md](./docs/features/ai-list-reorder.md) | Switch AI / Manage AIs 立即持久化排序 |
| [manage-ais-table-ux.md](./docs/features/manage-ais-table-ux.md) | Manage AIs 未启用置底、启用槽位拖拽、列筛选进 reaxel、空表不拆筛选浮层 |
| [menubar-current-ai-dropdown.md](./docs/features/menubar-current-ai-dropdown.md) | 中区 Current AI 块点击下拉切 AI |
| [ai-catalog-manual-update.md](./docs/features/ai-catalog-manual-update.md) | Settings 手动检查供应商目录（GitHub Release 资产） |
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
| [settings-view-preload.md](./docs/features/settings-view-preload.md) | Settings WCV 晚于启动 AI 页再 preload |
| [settings-menu-switch-perf.md](./docs/features/settings-menu-switch-perf.md) | Settings 侧栏切页 JSONL 埋点 |
| [e2e-playwright.md](./docs/features/e2e-playwright.md) | Playwright Electron E2E 框架与第一批用例 |

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
| [ai-login-session-lost-after-catalog-uuid.md](./docs/issues/ai-login-session-lost-after-catalog-uuid.md) | 升级后登录丢失：旧分区被 `Set-Cookie` 覆盖 |
| [google-ai-studio-electron-browser-identity.md](./docs/issues/google-ai-studio-electron-browser-identity.md) | AI Studio / Chrome 身份 |
| [i18n-architecture-issues.md](./docs/issues/i18n-architecture-issues.md) | i18n 架构问题 |
| [i18n-fixes.md](./docs/issues/i18n-fixes.md) | i18n 修复记录 |

### 其它

| 文档 | 内容 |
|------|------|
| [feature-design-and-comments.md](./docs/agent/feature-design-and-comments.md) | 新增功能：设计文档 + 关键注释 |
| [menu-label-width.md](./docs/modules/menu-label-width.md) | 菜单标签宽度 |
| [feature-proposal--ai-catalog-source.md](./docs/feature-proposal--ai-catalog-source.md) | AI 供应商目录单一事实源（分批；目录 ≠ 运行时实例） |
| [feature-proposal--cross-instance-session-migration.md](./docs/feature-proposal--cross-instance-session-migration.md) | 跨实例会话迁移提案 |
| [feature-proposal--update-session-backup.md](./docs/feature-proposal--update-session-backup.md) | 升级前备份 / 升级后还原 session（本机安全网） |
| [prompt-view-improvements.md](./docs/prompt-view-improvements.md) | Prompt 改进笔记 |
| [prompt-view-redesign.md](./docs/prompt-view-redesign.md) | Prompt 重设计 |
| [prompt-view-settings-fixes.md](./docs/prompt-view-settings-fixes.md) | Prompt / Settings 修复 |
| [fixme.md](./fixme.md) | 问题清单（P0–P3） |
| [todo.md](./todo.md) | 待办 |
