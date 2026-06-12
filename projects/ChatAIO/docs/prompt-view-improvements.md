## PromptView 优化需求文档

### 1. 纵向滚动条不占据容器宽度

**现状**：`.prompt-view-body` 使用 `overflow-y: auto`，滚动条占据 6px 布局宽度，压缩了卡片内容区域。

**目标**：滚动条以 overlay 方式覆盖在内容上方，不挤占内容宽度。

**方案**：
- Chromium/Electron：`overflow-y: overlay`（非标准但 Electron 内置 Chromium 支持）
- Firefox 后备：`scrollbar-width: thin` + `scrollbar-color` + 透明轨道
- 保留已有的 `::-webkit-scrollbar` 自定义样式（细滚动条 + 透明轨道）

### 2. 关闭按钮

**现状**：PromptView 没有关闭 UI，用户无法从 PromptView 内部关闭面板。

**目标**：在 header 右上角添加关闭按钮（X 图标），点击后触发 `hidePromptView`。

**实现链**：
1. IpcSchema.d.ts：新增 `close-prompt-view` RendererToMain event
2. preload.ts：暴露 `window.api.closePromptView(side)` 
3. Prompt-Views/index.ts（主进程）：注册 `close-prompt-view` handler，调用 `hidePromptView(side)`
4. App.tsx：header 添加关闭按钮，调用 `window.api.closePromptView(store.side)`

### 3. Engine 构建器 "not fresh" 分析

**根因**：`scripts/utils/build-artifacts.ts` 的 `assertFreshElectronStartupArtifacts` 在 build state status 为 `building` 时直接拒绝启动。当 webpack watch 检测到 main process 源码变更后触发重编译时，`compile`/`invalid` hook 将 status 设为 `building`，若用户在 `done` hook 恢复 `success` 之前启动 Electron，就会被 `getBuildStateFailure` 拦截。

**修复方案**：在 `buildStateFailure` 判定时，如果产物文件存在且 mtime 不小于所有源文件（即产物本身已是最新），则允许启动，不依赖于 build state 的瞬时状态。

---

### 影响范围

| 文件 | 变更类型 |
|------|----------|
| `src/Views/PromptView/index.less` | 修改滚动条样式 |
| `src/Views/PromptView/App.tsx` | 添加关闭按钮 UI |
| `src/Types/IpcSchema.d.ts` | 新增 `close-prompt-view` event 类型 |
| `src/preload.ts` | 暴露 `closePromptView` API |
| `src/Main/reaxels/Views/Prompt-Views/index.ts` | 注册 `close-prompt-view` handler |
| `scripts/utils/build-artifacts.ts` | 修复 `buildStateFailure` 判定 |
