# PromptView Visual Refresh Product Plan

## 结论

PromptView 本次优化定位为本地 prompt composer library，而不是独立设置页或远程 AI 页面的替代输入框。视觉上应贴近 ChatGPT、Gemini、Claude、Copilot 这类 C 端 AI 产品的共性：低噪声背景、聚焦文本输入、图标化操作、状态明确、弱边界卡片。

本阶段不改变数据模型、IPC、左右侧栏布局和自动保存策略，只重构 renderer UI 与样式。

## 需求理解

用户目标：

- PromptView 看起来更美观。
- UI 风格更 C 端，接近主流 AI 平台。
- 视觉表达极简，操作意义明确。
- 实现要延续 AI-WebApp 既有架构和代码风格。

非目标：

- 不把 prompt 自动注入远程 AI 网站输入框。
- 不新增文件上传、模型选择、工具菜单等主流 AI composer 能力。
- 不改 PromptView 左右侧栏的 Electron WebContentsView 布局逻辑。
- 不新增 npm 包。

## 调研结论

主流 AI 产品的输入体验有几个稳定方向：

- ChatGPT 已把模型选择移入 composer 附近，说明 prompt 输入区正在承载更多上下文控制，但核心仍是输入优先。
- ChatGPT 入门资料强调从写草稿、总结、整理想法等低风险聊天任务开始，PromptView 的文本暂存和复用应保持轻量。
- Copilot Chat 在 prompt 输入附近提供添加内容、工具、引用和语音入口，说明操作应靠近输入器并使用明确图标。
- Claude 文件上传入口位于聊天框左下角的加号，Artifacts 也强调可复用内容会在独立区域中查看、复制、导出，说明 PromptView 作为复用库应强化复制、编辑和组织。
- Gemini 官方页面展示的是消费级助手入口和简短的 prompt bar，整体偏简洁，不适合重装饰卡片或说明型布局。

参考资料：

- https://openai.com/academy/getting-started/
- https://help.openai.com/en/articles/6825453-chatgpt-release-notes
- https://support.microsoft.com/en-us/Microsoft-365-Copilot/get-started-with-microsoft-365-copilot-chat
- https://support.claude.com/en/articles/8241126-upload-files-to-claude
- https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them
- https://gemini.google/about/

## 产品方案

### 信息架构

PromptView 分为三层：

- Header：显示模块名、左右侧标识、新建按钮。
- Status line：显示 prompt 数量和保存状态。
- Prompt list：每条 prompt 是一个 composer card，包含拖拽把手、编号、复制、复制一份、删除、textarea 和字数状态。

### 视觉原则

- 背景使用中性浅灰或近黑，避免大面积高饱和颜色。
- 卡片圆角不超过 8px，边界用弱描边和轻阴影。
- 主要动作使用单个 primary 圆形加号。
- 次级动作全部图标化，并提供 tooltip。
- textarea 使用 composer-like 面板，聚焦时只强化边框和阴影。
- 深色模式不使用大面积蓝黑，改为中性暗色加低饱和 accent。

### 交互规则

- 新建 prompt 后沿用现有自动保存。
- 编辑 textarea 后沿用 220ms debounce 自动保存。
- blur 时立即持久化。
- 拖拽排序仍限制为纵向。
- 复制成功/失败仍使用 antd message。
- 出错时在列表顶部显示错误提示。
- 空列表显示最小空状态和新建入口。

## 技术方案

沿用现有技术：

- React 18 renderer。
- Reaxes `reaxper` 组件和 `reaxel_PromptView` 状态模块。
- antd 5 的 `ConfigProvider`、`Button`、`Input.TextArea`、`Tooltip`、`Spin`、`Alert`。
- `@dnd-kit` 的 `DndContext`、`SortableContext`、`useSortable`。
- CSS 变量承接 light/dark theme，同步逻辑继续由 `applyThemePreferenceToDocument()` 设置 `data-ai-webapp-theme`。

不需要新增：

- IPC channel。
- Main process service。
- PromptView type。
- 第三方依赖。

## 架构影响

改动文件：

- `src/Views/PromptView/App.tsx`
- `src/Views/PromptView/index.less`
- `src/Views/SettingsView/reaxels/i18n/langs/*.ts`

文档新增：

- `docs/features/prompt-view-visual-refresh.md`

保持不变：

- `src/Main/reaxels/Views/Prompt-Views/index.ts`
- `src/Main/services/prompt-view/index.ts`
- `src/preload.ts`
- `src/Types/IpcSchema.d.ts`
- `src/Types/PromptView.d.ts`

## 验收标准

- PromptView header 不再显示工程化的 `PromptViewLeft/Right` 主标题。
- 左右侧栏有清晰但不喧宾夺主的侧标识。
- prompt 卡片看起来像轻量 composer，而不是表单卡片。
- 操作按钮语义清晰，hover 后有 tooltip。
- light/dark 两套主题都可读，且不依赖单一色相堆叠。
- 260px 到 380px 侧栏宽度内不发生明显文本挤压或按钮溢出。
- TypeScript 编译不因本次改动新增错误。
