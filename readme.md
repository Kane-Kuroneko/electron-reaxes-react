# electron-reaxes-react

Electron monorepo powered by **[Reaxes](https://www.npmjs.com/package/reaxes)** & **React**.

基于 Reaxes 响应式框架与 React 的 Electron 多工程仓库：一套共享构建链（`engine`）+ 共用业务基建（`generic-services`），在 `projects/` 下并行维护多个桌面应用。

| | |
|---|---|
| 包管理 | **Yarn** workspaces（请勿用 `npm i`） |
| 运行时 | Electron + React 18 + TypeScript |
| 状态管理 | [Reaxes](https://kane-7.gitbook.io/reaxes-document) / [reaxes-react](https://www.npmjs.com/package/reaxes-react) |
| 许可证 | 根仓库 **MIT**（个别子工程可能另有声明，见各 `package.json`） |
| 仓库 | [Kane-Kuroneko/electron-reaxes-react](https://github.com/Kane-Kuroneko/electron-reaxes-react) |

---

## 目录

- [子工程索引](#子工程索引)
- [仓库结构](#仓库结构)
- [快速开始](#快速开始)
- [日常开发命令](#日常开发命令)
- [构建约定](#构建约定)
- [文档与规范](#文档与规范)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 子工程索引

应用与实验项目位于 [`projects/`](./projects/)。成熟度仅供参考，以各目录内文档为准。

### 应用 / 产品

| 子工程 | 简介 | 状态 | 文档 |
|--------|------|------|------|
| **[ChatAIO](./projects/ChatAIO/)** | **旗舰项目**：多 AI Web 服务统一桌面壳。每家 AI 独立登录态与 session 分区；支持自定义网页、跨 AI 提示词橱窗、全局/按 AI 代理、托盘与多语言等。 | 活跃维护 | [readme](./projects/ChatAIO/readme.md) · [docs/](./projects/ChatAIO/docs/) · [AGENTS.md](./projects/ChatAIO/AGENTS.md) |
| **[Life's-Too-Short](./projects/Life's-Too-Short/)** | 基于 OpenRouter 的 AI 桌面客户端（订阅/渠道、聊天定制、本地 SQLite 等）。 | 开发中 | [todo.md](./projects/Life's-Too-Short/todo.md) |
| **[AI-WebTools-AIO](./projects/AI-WebTools-AIO/)** | 多「孢子」(Spore) WebContentsView 拼版工作台：左侧分配栏 + 可拖拽分屏 DropPad，用于同时编排多家 AI 网页工具。 | 实验 / 演进中 | [doc.md](./projects/AI-WebTools-AIO/doc.md) |
| **[Autohotkey-GUI](./projects/Autohotkey-GUI/)** | AutoHotkey 相关小工具的 Electron GUI 宿主；其下再挂多个子应用。 | 见子目录 | 见下表 |

#### Autohotkey-GUI 子应用

| 子应用 | 简介 | 文档 |
|--------|------|------|
| **[War3](./projects/Autohotkey-GUI/projects/War3/)** | 《魔兽争霸 3》辅助：快速存档、按键屏蔽/映射、多语言 GUI 等。 | [todo.md](./projects/Autohotkey-GUI/projects/War3/todo.md) |
| **[Mouse-Btn-Fix](./projects/Autohotkey-GUI/projects/Mouse-Btn-Fix/)** | 用软件缓解鼠标硬件故障（如连点）：最短双击间隔等。 | [readme](./projects/Autohotkey-GUI/projects/Mouse-Btn-Fix/readme.md) |
| **[Turbo-Click-Reaxes](./projects/Autohotkey-GUI/projects/Turbo-Click-Reaxes/)** | 鼠标按住连点辅助：自定义频率、延迟与全局开关快捷键。 | [readme](./projects/Autohotkey-GUI/projects/Turbo-Click-Reaxes/readme.md) |

### 工具 / 原型

| 子工程 | 简介 | 状态 | 文档 |
|--------|------|------|------|
| **[Gamepad-Task-Manager](./projects/Gamepad-Task-Manager/)** | 大 UI 任务管理器，可用手柄操作，便于结束游戏进程；纵向列表，兼顾触控。 | 原型 | [readme](./projects/Gamepad-Task-Manager/readme.md) |
| **[WIN-GPU-Abnormal-Monitor](./projects/WIN-GPU-Abnormal-Monitor/)** | 监控 Windows 闲置时异常 GPU 开销：进程 GPU 占用排序、日志、唤醒触发；可经 Web 在手机上远程查看。 | 立项 / 规划 | [readme](./projects/WIN-GPU-Abnormal-Monitor/readme.md) |
| **[Proxy-Rules-Modifier](./projects/Proxy-Rules-Modifier/)** | UX 友好的代理路由规则 GUI；规划含重复文件扫描并硬链接省空间、拖拽操作等。 | 立项 / 规划 | [readme](./projects/Proxy-Rules-Modifier/readme.md) |
| **[QuenChing-Mod-Client](./projects/QuenChing-Mod-Client/)** | 早期 / 占位客户端骨架（当前源码较少）。 | 休眠 | — |

### ChatAIO 一瞥

旗舰能力摘要（完整说明见 [projects/ChatAIO/readme.md](./projects/ChatAIO/readme.md)）：

- 多 AI 同开，会话与登录态互不干扰
- 内置多家 AI，也可自定义任意网页
- 左右提示词橱窗，跨 AI 持久复用
- 全局代理 + 按 AI 单独出口，降低误直连风险
- 快捷键切换、系统托盘、亮暗主题、多语言

发行页（独立仓库）：[ChatAIO-Releases](https://github.com/Kane-Kuroneko/ChatAIO-Releases)

---

## 仓库结构

```text
electron-reaxes-react/
├── projects/                 # 各 Electron 子工程（Yarn workspaces）
├── generic-services/         # 跨工程复用：IPC toolkit、reaxels、utils、requester、i18n 等
├── engine/                   # Webpack / Babel / 路径与入口解析（构建内核）
├── scripts/                  # 根级 CLI：webpack/electron start·build、postinstall、图标替换等
├── patches/                  # patch-package 补丁
├── CODING_STANDARD.md        # 人读编码规范
├── .claude/ / .qoder/ …      # Agent / 规则与 skills
└── package.json              # workspaces + 根脚本
```

路径别名（构建期）：

| 别名 | 指向 |
|------|------|
| `#root/*` | 仓库根 |
| `#root-projects/*` | `projects/*` |
| `#project/*` / `#src/*` | 当前子工程 `src/*` |
| `#main/*` | 当前子工程 `src/Main/*` |
| `#generics/*` | `generic-services/*` |

### 共享包（`generic-services/`）

| 目录 | 用途 |
|------|------|
| `toolkit/` | Electron IPC、preload 封装、通用 React 路由工具等 |
| `reaxels/` | 跨应用 reaxel（存储、UI 缩放、运行时路径等） |
| `refaxels/` | 可多例工厂（如 i18n、时区、lottie） |
| `rehancers/` | 增强器（如浏览器持久化） |
| `utils/` | 与业务无关的工具函数 / hooks |
| `requester/` | 可插拔请求层 |
| `modify-electron/` | DevTools、外链等 Electron 行为微调 |

---

## 快速开始

### 环境要求

- **Node.js**（建议 LTS）与 **Yarn**
- **Windows**：本仓库大量子工程与调试场景面向 Windows；ChatAIO 另支持 macOS / Linux 打包脚本
- 开发 Windows 软链接：建议开启「开发人员模式」，或具备创建符号链接权限（见下文）

### 安装

```bash
git clone https://github.com/Kane-Kuroneko/electron-reaxes-react.git
cd electron-reaxes-react

# 新机 / 新 clone：先修好 Git 软链（.git/config 不会进版本库）
yarn setup:git-symlinks
# 若软链已退化成普通文本文件：
yarn tsx scripts/setup-git-symlinks.ts --restore

yarn
```

> **Reaxes 依赖说明**：根 `package.json` 当前通过 `file:../reaxes/...` 链接本地 [Reaxes](https://www.npmjs.com/package/reaxes) 构建产物。若你没有并列的 `../reaxes` 源码树，请改为使用 npm 上的 `reaxes` / `reaxes-react` / `reaxes-utils`，或自行克隆 Reaxes 源码并产出 `dist` 后再安装。文档：[Reaxes Document](https://kane-7.gitbook.io/reaxes-document)。

### 跑起来（以 ChatAIO 为例）

在 **monorepo 根目录**：

```bash
# 终端 1：打包并启动 webpack DevServer（renderer / preload / main）
yarn start:webpack
# 或显式指定工程与端口：
yarn tsx scripts/webpack.start/index.ts ChatAIO 4444

# 终端 2：启动 Electron（加载该子工程 dist）
yarn start:electron
# 或：
yarn tsx scripts/electron.start/index.ts ChatAIO
```

也可在子工程目录使用其 `package.json` scripts（内部会 `--cwd` 回根目录），例如 ChatAIO：

```bash
cd projects/ChatAIO
yarn start:webpack
yarn start:electron
```

---

## 日常开发命令

根目录常用脚本（完整列表见根 [`package.json`](./package.json)）：

| 命令 | 作用 |
|------|------|
| `yarn start:webpack` | 开发态 webpack（默认面向当前配置的工程流程） |
| `yarn start:electron` | 开发态启动 Electron |
| `yarn build:webpack` | 生产打包 ChatAIO 前端产物 |
| `yarn build:electron` / `:win` / `:mac` / `:linux` | electron-builder 打包 |
| `yarn webpack-start:AI-WebTools-AIO` 等 | 其他子工程的快捷脚本 |
| `yarn replace-app-icons` | 统一替换应用 / 托盘图标（见 [`scripts/replace-app-icons/AGENTS.md`](./scripts/replace-app-icons/AGENTS.md)） |

深层子工程路径写法示例（Autohotkey War3）：

```bash
yarn tsx scripts/webpack.start/index.ts Autohotkey-GUI/War3 5555
yarn tsx scripts/electron.start/index.ts Autohotkey-GUI/War3
```

引擎会按 `projects/<段>/...` 逐级解析；目标工程根目录需有带 `main` 字段的 `package.json`。

---

## 构建约定

从旧版构建说明整理，便于排查端口与产物路径。

### DevServer 端口优先级

1. 命令行参数  
2. `projects/<project-name>/partial.webpack-conf.ts` 中的 `devServer.port`  
3. `engine` 内部备用端口  

### 产物位置

- `webpack-start`：development 打包并启动 DevServer  
- `webpack-build`：production 产物，供 electron-builder 使用  
- 产物落在对应子工程的 `dist/`（含 `main.js`、`index.html` 等），Electron 从此处启动  

所有开发与打包命令建议从 **仓库根目录** 发起；构建工具链在 `engine/`，编排入口在 `scripts/`。

---

## 文档与规范

| 文档 | 说明 |
|------|------|
| [CODING_STANDARD.md](./CODING_STANDARD.md) | 编码规范（import 置底、缩进、命名等） |
| [.claude/CLAUDE.md](./.claude/CLAUDE.md) | Monorepo Agent 总览与规则索引 |
| [.claude/rules/ipc-coding.md](./.claude/rules/ipc-coding.md) | Electron IPC 约定 |
| [projects/ChatAIO/AGENTS.md](./projects/ChatAIO/AGENTS.md) | ChatAIO 开发 / Agent 入口 |
| [projects/ChatAIO/docs/](./projects/ChatAIO/docs/) | ChatAIO 架构、特性与已知问题 |

要点摘要：

- **Git 仓库根在 monorepo 根**，不在某个 `projects/*` 子目录  
- Renderer 只通过 preload 暴露的 `window.api` 通信；Main 侧使用封装好的 `useIpc*`  
- 业务无关工具优先放进 `#generics` / `utils`，避免在功能目录复制粘贴  

---

## 贡献指南

欢迎 Issue 与 PR。建议流程：

1. Fork / clone 后执行「快速开始」中的软链与 `yarn`  
2. 从 `main` 拉出功能分支，改动尽量聚焦单一子工程或共享模块  
3. 遵循 [CODING_STANDARD.md](./CODING_STANDARD.md)；涉及 ChatAIO 窗口 / menubar / IPC 时先读对应 `docs/issues`  
4. 本地用对应子工程的 `start:webpack` + `start:electron` 或根脚本验证  
5. 提交说明写清「为什么」；**未经维护者确认请勿 force push / rebase 远程历史**（本仓库与远程整合偏好 **merge**）  

报告 Bug 时请尽量附上：子工程名、OS / Electron 版本、复现步骤与相关日志路径（如 ChatAIO 的 `logs/`）。

---

## 许可证

根仓库声明为 **MIT**（见 [`package.json`](./package.json)）。  
部分子工程可能使用不同许可证（例如 ChatAIO 的 `package.json` 中为 WTFPL）——以各子工程声明为准。

---

## 相关链接

- [Reaxes（npm）](https://www.npmjs.com/package/reaxes) · [文档](https://kane-7.gitbook.io/reaxes-document)
- [ChatAIO Releases](https://github.com/Kane-Kuroneko/ChatAIO-Releases)
- [作者 @Kane-Kuroneko](https://github.com/Kane-Kuroneko)
