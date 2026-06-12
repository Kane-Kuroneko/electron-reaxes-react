# PromptView & Settings UX Fixes — Product Document

## 概述

修复三个问题：PromptView 按钮布局重叠、ManageAIs 的 "Load this AI when app starts" 开关无效、PromptView 纵向滚动条间隙过宽。

---

## 问题 1: PromptView Close Button 与 New Button 重叠

### 现状
- `New Button`（Plus 按钮）位于 `.prompt-view-header` 右侧，通过 flex `justify-content: space-between` 定位
- `Close Button`（X 按钮）使用绝对定位 `position: absolute; top: 8px; right: 8px; z-index: 10`
- 两个按钮在 header 右上角发生重叠或视觉冲突

### 目标
- 关闭按钮融入 header 布局，不再使用绝对定位
- 关闭按钮与新建按钮在 header 右侧成组排列，间距合理
- 保留圆形按钮样式，关闭按钮为 text 类型（低视觉权重），新建按钮为 primary 类型（高视觉权重）

### 方案
1. 将 `<Tooltip title={...}><Button className="prompt-view-close-button" .../></Tooltip>` 从 `<main>` 层级移入 `<header className="prompt-view-header">` 内部
2. 新增 `.prompt-view-header-actions` 容器包裹 New + Close 两个按钮
3. CSS：移除 `.prompt-view-close-button` 的绝对定位，改为 flex item；调整 header actions 区域样式
4. 视觉层次：New (primary, accent色) > Close (text, muted色)

### 影响文件
- `src/Views/PromptView/App.tsx`
- `src/Views/PromptView/index.less`

---

## 问题 2: "Load this AI when app starts" 开关未正确生效

### 现状
- `preloadOnStartup` 字段定义在 `AI.AIItem` 中（`AI.d.ts` line 19）
- 编辑 AI 的 Modal（`EditAIModal`）中有 "Preload on Startup" 复选框可配置此字段
- 但：
  1. **管理 AI 的 Table 行中没有此开关的可见入口** — 用户必须点 Edit 进入 Modal 才能看到
  2. **`getPreloadAIFamilies()` 返回 AI family 类型（如 "chatgpt"）而非 AI 实例 ID** — 当同 family 存在多个实例时，family 粒度无法区分具体哪個实���需要预加载（fixme.md P2-03）

### 根因分析
1. **Family vs ID 粒度问题**：`ai-config-service.ts` 的 `getPreloadAIFamilies()` 返回 `AI.AIFamily[]`，而 runtime 体系使用 `AIItem.id` 作为页面身份标识。同 family 多实例时，family 粒度的预加载配置会丢失实例身份。
2. **UI 可见性问题**：用户无法在 Table 中直接看到/切换 `preloadOnStartup` 状态，只能通过 Edit Modal 操作，且操作后需要 Apply/Save 才会持久化。

### 目标
1. 将 `getPreloadAIFamilies()` 改为基于 AI 实例 ID 的 API
2. 在 ManageAIs Table 中增加 "Preload on Startup" 列，用户可直接 toggle
3. 确保开关变更正确参与 Settings Apply/Save 流程

### 方案

#### 2a. 核心 API：Family → ID
- `ai-config-service.ts`：新增 `getPreloadAIIds(): string[]` 返回预加载 AI 的 ID 列表；保留 `getPreloadAIFamilies()` 作为兼容层
- `IpcSchema.d.ts`：`'get-preload-ai-families'` RPC 返回类型改为 `string[]`
- `preload.ts`：重命名导出为 `getPreloadAIIds`
- `SettingsView/services/Settings/index.ts`：同步更新
- `Main/reaxels/Settings/index.ts`：更新 handler
- `Main/reaxels/Views/index.ts`：`update-preload-ai-config` 事件处理改为使用 ID 列表

#### 2b. Table 列新增 "Preload on Startup" 开关
- 在 `ManageAIs/index.tsx` 的 columns 数组中添加新列
- 列标题: "Preload on Startup"
- 渲染: Switch 组件，checked 绑定 `ai.preloadOnStartup`，onChange 直接 mutate store
- 位置: 在 "Enabled" 列之后、"AI name" 列之前

### 影响文件
- `src/Main/services/settings/ai-config-service.ts`
- `src/Types/IpcSchema.d.ts`
- `src/preload.ts`
- `src/Views/SettingsView/services/Settings/index.ts`
- `src/Main/reaxels/Settings/index.ts`
- `src/Main/reaxels/Views/index.ts`
- `src/Views/SettingsView/components/ManageAIs/index.tsx`

---

## 问题 3: PromptView 纵向滚动条保留过宽的空白区

### 现状
`.prompt-view-body` 使用 `scrollbar-gutter: stable`，始终保留滚动条宽度（约 6px），即使内容不足无需滚动时也保留间隙，导致右侧出现不美观的空白区域。

### 目标
- 无滚动条时不保留间隙
- 有滚动条时正常显示（不压缩内容宽度）

### 方案
将 `scrollbar-gutter: stable` 改为 `scrollbar-gutter: auto`。在 Electron 内置 Chromium 中，`auto` 会在需要滚动条时才保留 gutter 空间，无需时则不留。

### 影响文件
- `src/Views/PromptView/index.less`

---

## 验证方式

### 问题 1
- 视觉检查：PromptView header 右上角，Close(X) 和 New(+) 按钮并排，无重叠
- 功能检查：关闭按钮可正常关闭 PromptView

### 问题 2
- 在 ManageAIs Table 中 toggle 某个 AI 的 "Preload on Startup" → Save & Exit
- 重启应用 → 观察该 AI 页面是否在启动时预加载
- 同 family 多实例时，仅 toggle 的实例被预加载

### 问题 3
- PromptView 内容较少无滚动条时，右侧无多余空白
- 内容较多出现滚动条时，滚动条正常显示且不压缩内容
