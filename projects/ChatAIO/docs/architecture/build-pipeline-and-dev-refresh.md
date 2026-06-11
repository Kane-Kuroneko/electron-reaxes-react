# Build Pipeline and Dev Refresh Architecture

## 结论

ChatAIO 当前打包构建流程可运行，但架构边界不够清晰：公共 `engine/webpack` 承担了 webpack、WebpackDevServer、React Refresh、HTTPS 证书、HMR、构建落盘等底层细节；ChatAIO 的 `partial.webpack-conf.ts` 又重复手写 renderer 多入口、HTML 插件、输出路径和运行时 URL。这个组合导致 View 入口变更、dev server fallback、HMR public path 和 Electron load URL 之间缺少单一事实来源。

本次改造目标不是重写构建系统，而是增加一层较薄的应用入口抽象：

- ChatAIO 只声明 renderer entry manifest。
- 公共 webpack helper 根据 manifest 生成 entry 和 HTML 插件。
- Main 进程通过统一工具生成 dev URL 和生产 HTML 路径。
- 公共 dev server 修正多入口 fallback。
- dev renderer 显式设置 publicPath，避免 HMR 在多入口子目录下请求错误的 hot-update 资源。

## 需求理解

用户要求：

- 完整阅读 monorepo 公共结构、ChatAIO 子工程代码和文档，尤其是 `.qoder` / `.codex` / `.cursor` 中面向 agent 的规则。
- 评估打包构建流程架构是否合理，尤其是 engine 是否过度直接依赖底层技术并暴露太多细节。
- 做适当修改，而不是只给分析。
- 修复 dev 环境修改 renderer 代码热更新后，SettingsView 或其他 View 在 Electron 中刷新/load 异常，必须说明问题环节。

非目标：

- 不重写全部 monorepo 构建脚本。
- 不引入新的包管理器或新增 npm 包。
- 不改变 ChatAIO 的用户可见 UI 功能。
- 不改变 Electron IPC 安全边界。

## 已阅读约束

本次分析依据包括：

- 根规则：`CODING_STANDARD.md`、`.qoder/rules/coding-standard.md`、`.qoder/rules/ipc-coding.md`。
- Codex skill：`.codex/skills/electron-reaxes-react/SKILL.md`。
- Qoder skill：`.qoder/skills/reaxes-development/SKILL.md`。
- `.cursor`：当前目录为空，未发现可读规则文件。
- ChatAIO 文档：`todo.md`、`fixme.md`、`docs/architecture/*`、`docs/features/*`、`docs/issues/*`。
- 构建入口：`engine/webpack/*`、`scripts/webpack.start/*`、`scripts/webpack.build/*`、`scripts/electron.start/*`、`scripts/utils/*`。
- ChatAIO runtime：`partial.webpack-conf.ts`、`src/Main/reaxels/Views/*`、`src/Main/services/dev/*`、`src/Views/*`。

根目录 `AGENTS.md` 和 skill 中提到的 `projects/ChatAIO/AI-CONFIG-ARCHITECTURE.md` 在当前工作区不存在；本次以用户消息中的 AGENTS 规则和现存仓库文件为准。

## 技术调研结论

### Webpack 多入口和 HMR

ChatAIO renderer 输出为多入口目录：

- `SettingsView/index.html` + `SettingsView/main.js`
- `FloatingView/index.html` + `FloatingView/main.js`
- `GuidingView/index.html` + `GuidingView/main.js`
- `PromptView/index.html` + `PromptView/main.js`

在 development 下，webpack 默认 `publicPath: auto` 会从当前 script URL 推导资源基准路径。对于 `SettingsView/main.js` 这类子目录脚本，HMR runtime 可能把 hot-update manifest/chunk 请求到 `/SettingsView/...hot-update...`，而 webpack 默认 hot-update 文件并不一定按这个子目录布局输出。该不一致会导致热更新失败并触发全量 reload。

全量 reload 时，当前公共 dev server 的 `historyApiFallback.index = '/renderer/index.html'` 与 ChatAIO 实际输出不匹配。ChatAIO 没有 `renderer/index.html`，因此在某些刷新或 fallback 场景下会出现 Electron 里 load 失败，只能重启 webpack 和 Electron 恢复。

### Electron 本地 View 运行模型

ChatAIO 同时使用：

- 主窗口 `BrowserWindow`。
- 本地 Settings/Prompt `WebContentsView`。
- 本地 Guiding/Floating `BrowserWindow`。
- 远程 AI 页面 `WebContentsView`。

本地 renderer view 的 dev URL 和生产 HTML 路径目前散落在多个文件中手写，属于构建配置和运行时加载路径的双重事实来源。新增或重命名 View 时，需要同时改 webpack entry、HTML 插件和 Main 侧 load URL，遗漏概率较高。

### UX 影响

该问题不是用户操作层面的 UX 设计问题，而是开发体验和调试可靠性问题。合理的 dev UX 应满足：

- 修改 renderer 代码后 React Refresh 或全量 reload 不破坏 Electron 当前 View。
- 刷新 SettingsView、GuidingView、FloatingView、PromptView 时能落回对应入口 HTML。
- 新增本地 View 时不需要在多个构建和运行时位置重复拼路径。

## 现状评估

### 合理部分

- 公共脚本按 main / preload / renderer 分离构建，方向合理。
- `scripts/webpack.start/index.ts` 已有构建状态文件，用于 `electron.start` 前校验 main/preload artifact 是否新鲜。
- ChatAIO 把 Main、Views、Settings services 分层，整体仍能沿 Reaxes/Electron 边界扩展。

### 脆弱部分

- 公共 dev server fallback 指向不存在的 `/renderer/index.html`。
- development renderer 没有显式 `publicPath`，多入口子目录下 HMR 资源定位不稳定。
- ChatAIO 的 renderer entry、HTML 插件和 Main load URL 分散重复。
- `partial.webpack-conf.ts` 直接依赖 `HtmlWebpackPlugin` 并重复 4 次，暴露了底层 webpack HTML 生成细节。
- Main 侧多个文件重复实现 `createDevRendererURL()` 和 fresh load headers。

### 跨项目兼容判断

公共 dev server 是 monorepo 共享配置，因此 fallback 不能只服务 ChatAIO。已核对其他现有 Electron 子工程的 renderer 输出形态：

- `Autohotkey-GUI/War3` 输出根 `index.html`，开发 URL 是 `/`。
- `AI-WebTools-AIO` 输出 `/AllocatorView/index.html` 和 `/DropPadView/index.html`，开发 URL 是 `/AllocatorView` / `/DropPadView`。
- `Life's-Too-Short` 输出 `/main-chat/index.html` 和 `/float-channels-chat/index.html`，开发 URL 至少包含 `/main-chat/`。

新的 fallback 策略保留根 `/index.html`，并把首段路径形式的入口 fallback 到 `/<entry>/index.html`。这覆盖 ChatAIO 的本地 View，也不要求其他子工程改动现有 URL。

## 架构方案

### 1. Renderer Entry Manifest

新增 ChatAIO 共享 manifest：

```text
src/shared/renderer-entries.ts
```

职责：

- 统一声明本地 renderer entry 名称。
- 统一声明每个 entry 的源码入口相对路径。
- 给 Main 进程提供 entry 名称类型。

### 2. Webpack Entry Helper

新增公共 helper：

```text
engine/webpack/electron-renderer-entries.ts
```

职责：

- 输入 project root、entry manifest、template、outputPath。
- 输出 webpack `entry`、`output` 和 `HtmlWebpackPlugin` 列表。
- 将 `HtmlWebpackPlugin` 这种底层细节留在公共构建层，ChatAIO 只声明“有哪些 renderer entry”。

### 3. Runtime Renderer URL Helper

新增 ChatAIO Main 侧工具：

```text
src/Main/services/dev/renderer-entry.ts
```

职责：

- 生成 dev renderer URL。
- 生成生产 renderer HTML 文件路径。
- 统一 no-cache loadURL headers。
- 避免 SettingsView、GuidingView、FloatingView、PromptView 各自拼路径。

### 4. Dev Server 修正

公共 dev server 调整：

- 多入口直接访问 `/SettingsView` 或 `/SettingsView/` 时 fallback 到 `/SettingsView/index.html`。
- 默认 fallback 回 `/index.html`，避免继续指向不存在的 `/renderer/index.html`。

development renderer 调整：

- 显式 `output.publicPath = '/'`，让 HMR hot-update 从 dev server 根路径解析，避免被当前 entry 子目录污染。

## 验收标准

- 修改 SettingsView renderer 后，Electron 中 SettingsView 可继续热更新或全量刷新。
- 直接刷新 `/SettingsView`、`/FloatingView`、`/GuidingView`、`/PromptView` 不再落到不存在的 `/renderer/index.html`。
- ChatAIO `partial.webpack-conf.ts` 不再重复手写 4 个 HtmlWebpackPlugin。
- Main 侧不再重复定义 renderer dev URL helper。
- `tsc -p projects/ChatAIO/tsconfig.json --noEmit` 不因本次改动新增错误；如遇历史 blocker，需要记录。
- `yarn build:webpack` 或等价 webpack 构建可以通过，除非出现与本次无关的既有错误。

## 实现记录

| 模块 | 路径 | 状态 |
|------|------|------|
| Renderer entry manifest | `src/shared/renderer-entries.ts` | 已完成 |
| Webpack entry helper | `engine/webpack/electron-renderer-entries.ts` | 已完成 |
| Runtime URL helper | `src/Main/services/dev/renderer-entry.ts` | 已完成 |
| Webpack 配置收敛 | `partial.webpack-conf.ts` | 已完成 |
| Dev publicPath | `engine/webpack/dev.conf.ts` | 已完成 |
| Dev server fallback | `engine/webpack/devserver.ts` | 已完成 |
| Main View 加载统一 | `initWebContentsView.ts`、`Guiding-View`、`FloatingView` | 已完成 |

## 根因与修复环节

dev 热更新后 View 无法 load 的链路：

1. **HMR publicPath（`engine/webpack/dev.conf.ts`）**  
   多入口 renderer 脚本位于 `/SettingsView/main.js` 等子路径，默认 `publicPath: auto` 会让 hot-update 请求落到 `/SettingsView/*.hot-update.json`，与 dev server 实际输出位置不一致 → HMR 失败 → 触发全量 reload。

2. **Dev server fallback（`engine/webpack/devserver.ts`）**  
   全量 reload 或 `webContents.reload()` 时，dev server 的 `historyApiFallback.index` 原先指向 `/renderer/index.html`，而 ChatAIO 并无此文件 → Electron 内页面 404，只能重启 webpack + Electron。

3. **运行时 URL 分散（Main 各 View 模块）**  
   各 View 手写 dev URL 与 cache-bust header，格式不统一（有无尾斜杠、query 拼接方式各异），增加排查成本。已收敛到 `renderer-entry.ts` 与 `renderer-entries.ts` 单一事实来源。
