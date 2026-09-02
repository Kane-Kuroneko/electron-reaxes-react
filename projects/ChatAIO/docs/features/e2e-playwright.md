# Playwright E2E 框架

ChatAIO 用 Playwright 的 `_electron.launch` 跑真实 unpackaged Electron，测主壳 / menubar / GuidingView / DropdownView 这些 BrowserWindow 级用户路径。不测远程 AI 站点 DOM。

## 调研结论（2026-09）

对齐的成熟做法：

| 来源 | 做法 |
|------|------|
| [Playwright Electron API](https://playwright.dev/docs/api/class-electron) | `_electron.launch` + `firstWindow` + `evaluate` 进主进程；原生 dialog 必须 stub |
| [Playwright 自己的 electronTest](https://github.com/microsoft/playwright/blob/main/tests/electron/electronTest.ts) | 每测一份临时 userData；不要把 profile 放进 test-results |
| [VS Code `playwrightElectron.ts`](https://github.com/microsoft/vscode/blob/main/test/automation/src/playwrightElectron.ts) | 长 timeout、tracing、启动失败带出 crash 上下文 |
| [Folo desktop e2e](https://github.com/RSSNext/Folo) | `workers: 1`、mkdtemp userData、测完 `rm` profile |
| [Dyad e2e](https://github.com/dyad-sh/dyad) | `--user-data-dir` / 环境变量隔离；Windows **不要**默认 recordVideo（ffmpeg hang）；evaluate 要能重试 |
| [electron-playwright-helpers](https://github.com/spaceagetv/electron-playwright-helpers) | Electron 27+ 的 `evaluate` 会随机 `Execution context was destroyed`，需 retry |

Spectron 已死。本仓不引入打包后的 `findLatestBuild`：E2E 打 unpackaged `electron.exe` + `yarn build:webpack` 产物，接近日常 `start:electron`，但 renderer 走文件而不是 webpack-dev-server。

## 不变量

1. **隔离 userData**：`CHATAIO_E2E=1` + `CHATAIO_E2E_USER_DATA_DIR` 覆盖 `setAppProfilePath`。禁止写本机 `%APPDATA%/ChatAIO-dev`。
2. **不改操作系统全局状态**：不 `npx playwright install` Chromium、不改系统代理、不 `taskkill /im electron.exe`（只杀本次 pid）。
3. **workers = 1**：Electron GPU / 单用户数据模型；并行要另开隔离端口与 userData，本阶段不做。
4. **E2E 加载 `dist/renderer/*/index.html`**：`shouldUseDevRendererServer()` 在 `CHATAIO_E2E=1` 时为 false。日常 `yarn start:electron` 仍走 localhost:4444。
5. **Playwright 管得了 BrowserWindow，管不了 WebContentsView**（上游 issue #39507 同类限制）。Settings / Prompt / AI 页用主进程探针 `__CHATAIO_E2E__.getSnapshot()`。
6. **首启**：测试 mkdtemp 会先建目录，不能再用 `existsSync(userData)`。只有 `CHATAIO_E2E_FIRST_LAUNCH=1` 才走 GuidingView。
7. **Windows FloatingView 仍禁止 `forward: true`**。E2E 不改鼠标穿透。
8. **Electron 故障必须让测试失败**，不能只断言 UI。捕获矩阵见下一节。禁止只靠 Playwright `page` 断言当绿。
9. **改了 `src/Main` 必须先 `yarn build:webpack` 再跑 E2E**。`globalSetup` 只在 `dist/` 缺文件时构建，**不**按 mtime 增量编译；跑到旧 `dist/main.js` 会假绿。

## Electron 故障捕获矩阵

用户看到的「窗口弹错」多半是原生 `dialog.showErrorBox`（标题 *A JavaScript error occurred in the main process*）。Playwright 的 `Page` / `windows()` **看不见**这扇系统窗。

| 通道 | 是否捕获 | 怎么接到测试 |
|------|----------|----------------|
| 主进程 `uncaughtException` / `unhandledRejection` | 是 | `e2e-faults` → 内存 + `userData/e2e-faults.jsonl` |
| Electron `dialog.showErrorBox` | 是 | E2E 下替换为记账、**不弹模态**（否则 `evaluate` 会卡死） |
| 自有壳 `render-process-gone`（Main/Guiding/Dropdown/Floating/Settings/Prompt） | 是 | `app.on('render-process-gone')`，忽略 `clean-exit` / `killed` |
| GPU / Zygote `child-process-gone` | 否（故意） | Windows 上太噪，会假红 |
| Utility 进程 `crashed` / `oom` / `integrity-failure` | 是 | `app.on('child-process-gone')` |
| preload 加载失败 | 是 | `web-contents-created` → `preload-error` |
| BrowserWindow 渲染进程 JS 异常 | 是 | Playwright `page.on('pageerror')`（Main/Guiding/Dropdown/Floating） |
| WebContentsView 里的 JS 异常（Settings / Prompt / 远程 AI） | **否** | Playwright 没有这些 WCV 的 Page；远程 AI 的 `console.error` 也不能当失败 |
| `try/catch` + `console.error` 后继续跑 | **否** | 产品有意吞掉的错误，例如 `whenReady` 之外大量 Views 恢复路径 |
| ESM import 早于 `e2e-bootstrap`、或 Playwright 启动期 stderr（[#36968](https://github.com/microsoft/playwright/issues/36968)） | 部分 | bootstrap 已尽量提前；launch 返回前的 stderr 仍可能丢 |
| 关窗 / `app.exit` 之后的 tick | 忽略 | `__chatAIOQuitting` 后不再记账，避免 teardown 假红 |

落地要点：

- **文件优先于 evaluate**：主线程被 `showErrorBox` 卡住、或进程已死时，`electronApp.evaluate` / `__CHATAIO_E2E__.drainFaults` 会失败。fixture 在 `close` 之后、删 profile 之前读 jsonl。
- **`waitForE2ESnapshot` 不得吞掉 fault**：探针未就绪 / context destroyed 才重试；已有 `snapshot.faults` 必须立刻抛。
- **stderr 正则只是兜底**：`PROCESS_FAULT_RE` 很窄，不能当主路径。主路径是 jsonl + probe + pageerror。

## 怎么跑

在仓库根：

```bash
yarn test:e2e
```

缺 `projects/ChatAIO/dist` 时 globalSetup 会跑 `yarn build:webpack`。只检查不构建：

```bash
set CHATAIO_E2E_SKIP_BUILD=1
yarn test:e2e
```

看 Electron 日志：`CHATAIO_E2E_DEBUG=1`。headed：`yarn test:e2e:headed`。

`@playwright/test` 安装时设 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`，因为测的是仓库里的 Electron，不需要额外 Chromium。

## 目录

| 路径 | 职责 |
|------|------|
| `projects/ChatAIO/e2e/playwright.config.ts` | workers=1、trace/screenshot on failure、关闭 video |
| `projects/ChatAIO/e2e/global-setup.ts` | 检查 / 补齐 webpack 产物 |
| `projects/ChatAIO/e2e/fixtures.ts` | `electronApp` / `mainWindow` |
| `projects/ChatAIO/e2e/support/launch.ts` | `_electron.launch`、env、按 pid 关闭 |
| `projects/ChatAIO/e2e/tests/*.spec.ts` | 用例 |
| `src/Main/foundation/e2e-bootstrap.ts` | **index.ts 第一个 import**，赶在 before-launch 依赖图之前挂收集器 |
| `src/Main/foundation/e2e-mode.ts` | `CHATAIO_E2E` 闸门 |
| `src/Main/foundation/e2e-faults.ts` | uncaught / dialog.showErrorBox / process-gone / preload-error → 内存 + jsonl |
| `src/Main/foundation/e2e-probe.ts` | 主进程快照；`drainFaults` 只是热路径，关进程后以 jsonl 为准 |

## 当前用例（按工程文档选的）

| 文件 | 覆盖 | 文档 |
|------|------|------|
| `launch.spec.ts` | 返回用户冷启动 menubar visual-ready | menubar-cold-start-monitor |
| `guiding-first-launch.spec.ts` | 首启 GuidingView | GuidingView |
| `menubar-current-ai.spec.ts` | 中区 badge 下拉切 AI | menubar-current-ai-dropdown |
| `settings-open.spec.ts` | Application → Settings，badge 变静态 | menubar-current-ai-dropdown 不变量 6 |
| `prompt-toggle.spec.ts` | View → Left Prompt Showcase | prompt-view |

不把远程 ChatGPT/Gemini 登录、白屏监控、Windows `forward: true` 放进第一批：那些要站点 DOM 或禁止项本身就不能用自动化去「修」。

## 禁止项

- 不要对系统装 Playwright 浏览器或改 `core.symlinks` 以外的 git 配置。
- 不要用 `taskkill /im electron.exe` 清场。
- 不要让 E2E 默认打开 webpack-dev-server。
- 不要把 userData 写进 `test-results/`（会当 artifact 上传）。
- 不要假设 Playwright `windows()` 含 Settings/Prompt/AI 的 WebContentsView。
- 不要把 `mainWindow.getContentBounds()` 写进函数默认参数：`closed` 会把 `mainWindow` 置 `null`，Prompt 动画 tick 会炸（`Cannot read properties of null (reading 'getContentBounds')`），窗口弹错而测试仍绿。
- 不要只靠 `uncaughtException` 内存数组：进程死了或主线程被原生对话框卡住时，`evaluate` 读不到。必须写 jsonl。
- 不要在 E2E 里真弹 `showErrorBox`：Playwright 点不掉，后续探针也会挂死。
