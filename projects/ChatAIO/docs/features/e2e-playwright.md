# Playwright E2E 框架

ChatAIO 用 Playwright 的 `_electron.launch` 跑真实 unpackaged Electron。测主壳 BrowserWindow（Main / Guiding / Dropdown / Floating）以及 **已发现的 WebContentsView Page**（Settings、AI 页也会进 `windows()`）。不测远程 AI 站点 DOM。

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

## Settings WCV：探路结论（2026-09）

历史文档按 [playwright#39507](https://github.com/microsoft/playwright/issues/39507)（BrowserView）写成「`windows()` 只有 BrowserWindow」。本机 `@playwright/test` **1.62** 实测不是这样。

打开 Application → Settings 之后：

| 来源 | 看到什么 |
|------|----------|
| `electronApp.windows()` | `MainView`、`DropdownView`、`FloatingView`、**`SettingsView/index.html`**、当前 AI（如 `https://chatgpt.com/`） |
| `settings.getByTestId('settings-root')` | count = 1，可点 |
| 主进程 `webContents.getType()` | Settings WCV 也报 `window`，**不能**靠 type 区分 BW / WCV |
| `BrowserWindow.fromWebContents(settingsWcv)` | **null**（[electron#42060](https://github.com/electron/electron/issues/42060)）。因此不要用 `electronApp.browserWindow(page)` 去拿宿主窗 |

官方 1.60 回归：[playwright#39427](https://github.com/microsoft/playwright/issues/39427) / PR #39912。入口：`waitForSettingsPage` / `openSettingsFromApplicationMenu`。

### 否决的做法

- **E2E 里把 Settings 改建成 BrowserWindow。** 测不到生产的 park / present / z-order（[`settings-view-preload.md`](./settings-view-preload.md)）；Windows 上多一扇 BW 还可能搅 menubar 拖拽（[`menubar-drag-investigation.md`](../issues/menubar-drag-investigation.md)）。点 HTML 不需要换宿主。
- **只调 `reaxel.foo()`、不渲染 Settings。** 盖得了 IPC / dirty 指纹，盖不住弹窗 `saving`、表底 `disabled={aisDirty}`、长按重置等组件 state。reaxel 公开方法适合主进程探针或 `executeJavaScript` 契约测试，不能替代 DOM 手势。
- **产品启动时自测。** 不要把用例写进日常 runtime。

### 测试分层（后续加用例按这张表）

| 层 | 测什么 | 怎么驱动 | 现有锚点 |
|----|--------|----------|----------|
| 纯函数 | dirty 指纹、单条提交不洗净表 | Node `yarn test`（`tests/settings-dirty-scopes.test.ts`） | `tests/settings-dirty-scopes.test.ts` |
| 主进程写盘 | `apply-settings` 不写 AIs；`apply-ais` / `update-ai` | `__CHATAIO_E2E__` 探针 | `e2e/tests/settings-ais-save-scopes.spec.ts` |
| Settings DOM | 页脚 vs 表底按钮、弹窗、侧栏 | Settings **WCV Page** 的 locator | `settings-ais-save-scopes-ui.spec.ts`（仅 Enabled → 表底 Save） |
| 壳层 | 打开 Settings、badge 静态 | MainView + Settings Page | `settings-open.spec.ts`、`settings-wcv-discovery.spec.ts` |

写盘对不对用探针；按钮亮不亮、接线对不对用 Settings Page。两边都要时同一条用例里先点 DOM 再读探针。

### 写 DOM 用例时记住

1. 先 `openSettingsFromApplicationMenu`，不要假定 `firstWindow()` 是 Settings。
2. seed profile 语言是 **en-US**，用 role + 英文名（`Manage AIs`、`Apply` exact、`Save` exact）。`Save & Exit` 不是表底 Save。
3. `rehancer_Dev` 仍会把侧栏切到 Networks；进表前要点 **Manage AIs**。不要在 E2E 里为了省事改生产默认 tab。
4. 返回用户 seed 用 `about:blank`，`windows()` 里不应再出现 `chatgpt.com`。若某条用例没 seed `user-ais.json`，远程 AI 页仍可能进 `windows()`，**禁止**对其做 locator。
5. 调 `applySettings` / `applyAIs` 探针前等 `runtimeViewsReady`（`kind==='main'` 在 Phase 0 就真了）。**mutating `evaluate` 不要把整份 settings 从 Playwright 克隆进 main**（structured clone 会丢 `startup`）；在 main 里 `getSettings()` 再改字段。Playwright 对返回的 Promise 是弱引用，纯 JS `async` 会被 V8 收成 `Promise was garbage collected`——evaluate 里用 `setTimeout` 钉住 native，**不要对 GC 再 retry apply**（可能已经写完）。见 [electron-playwright-helpers](https://www.npmjs.com/package/electron-playwright-helpers)。`user-settings.json` 的路径必须在 **每次 I/O** 读 `app.getPath('userData')`：主进程单例若在 `setAppProfilePath` 之前构造，会把文件写到 Electron 默认 userData，内存是新值、E2E 隔离盘仍是 seed。
6. 改了 `src/Main` 必须 `yarn build:webpack`；只改 Settings renderer 同样要重建，否则 E2E 仍跑旧 `dist`。
7. **返回用户 seed 写小型 `user-ais.json`**：`custom-e2e-a`…`d`（Bravo 默认关），URL `about:blank`，`deletedIds` 钉死 bundled 目录 + `dev-proxy-test`。不要假定菜单里还有 ChatGPT。常量：`e2e/support/e2e-ais.ts`。单独用例要改 seed 用 fixture `userAisPatch`，不要改默认表。
8. **关下拉再立刻 `openSwitchAiMenu` 会不稳**：`closeDropdownView` 不清 MainView `openMenuId`，再点同一顶级项会被当成 toggle 收起。要换菜单先点 View 再开 Switch AI（`reopenSwitchAiMenu`）。能点当前已开菜单就别关再开。读 Manage AIs 行序用 `.manage-ais-table .ant-table-body`，避开 antd 的 hidden measure 行。Startup 单选点 `data-testid=startup-ai-page-first` 的 label（DOM `click()`），页脚 Apply 看 `data-testid=settings-footer-apply` 的 `data-dirty`。不要 `locator.check()`。

不变量 5 与禁止项与本节一致。后续会话加手势用例时，先对照本节分层和「写 DOM 用例时记住」，不要再探一遍 WCV。

### 后续用例 backlog（未写）

产品不变量见 [`manage-ais-save-scopes.md`](./manage-ais-save-scopes.md)、[`ai-list-reorder.md`](./ai-list-reorder.md)。设计用例时按分层表选 DOM 或探针，不要一条里既当单元又当手势。

已落地的手势见「当前用例」。下面只列还没自动化、或故意不进 E2E 的：

| 手势 / 不变量 | 建议层 | 状态 |
|---------------|--------|------|
| 目录 check/apply stub GitHub + 验签 | 探针 + 可选 DOM | 未写（脏挡板已有） |
| 关窗后进程必须死 / 第二次启动唤起已有窗 | 进程生命周期集成测试（**不用**默认 fixture） | 已写：`e2e/tests/app-lifecycle.spec.ts`；见 [close-without-tray-process-lingers.md](../issues/close-without-tray-process-lingers.md)「怎么测」 |
| 远程 AI 站点 DOM、白屏、`forward: true` | 禁止 | 见禁止项 |
| 长按 Advanced 重置全部 AI 页 | 不测 | 破坏性；默认套件不碰 |

i18n / antd 选择器不稳时再给页脚、表底、弹窗加 `data-testid`，不要先改生产默认侧栏 tab。

## 不变量

1. **隔离 userData**：`CHATAIO_E2E=1` + `CHATAIO_E2E_USER_DATA_DIR` 覆盖 `setAppProfilePath`。禁止写本机 `%APPDATA%/ChatAIO-dev`。单实例锁跟 userData 走，因此 E2E 临时目录不会和本机生产/开发包抢实例（见 [single-instance.md](./single-instance.md)）。
2. **不改操作系统全局状态**：不 `npx playwright install` Chromium、不改系统代理、不 `taskkill /im electron.exe`（只杀本次 pid）。
3. **workers = 1**：Electron GPU / 单用户数据模型；并行要另开隔离端口与 userData，本阶段不做。
4. **E2E 加载 `dist/renderer/*/index.html`**：`shouldUseDevRendererServer()` 在 `CHATAIO_E2E=1` 时为 false。日常 `yarn start:electron` 仍走 localhost:4444。
5. **Playwright `windows()` 能发现 WebContentsView**（本机 1.62 已验证：打开 Settings 后有 `SettingsView/index.html`，`data-testid=settings-root` 可点）。官方回归见 [playwright#39427](https://github.com/microsoft/playwright/issues/39427) / 1.60。不要为了点 Settings 把生产 WCV 改成 BrowserWindow。远程 AI 页也会出现在 `windows()` 里，仍然不测站点 DOM。主进程探针继续覆盖写盘契约；`kind === 'main'` 在 runtime Phase 0 就为真，调 `apply-settings` / `apply-ais` 前要等 `runtimeViewsReady`。
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
| BrowserWindow 渲染进程 JS 异常 | 是 | Playwright `page.on('pageerror')`（Main/Guiding/Dropdown/Floating；打开后的 Settings WCV 也会进 `windows()`） |
| WebContentsView 里的 JS 异常（未打开的 Settings / Prompt / 远程 AI） | 部分 | 已进 `windows()` 的 WCV 可挂 `pageerror`；远程 AI 的 `console.error` 仍不当失败 |
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

看 Electron 日志：`CHATAIO_E2E_DEBUG=1`。`--headed` 对 unpackaged Electron **几乎无效果**（窗本来就在）；要看清点击请用下面的观测命令。完整命令与参数见 [`scripts.md`](../../scripts.md)。

终端按 spec 短名分组（不再把 `[electron] › 长路径 › 标题` 挤一行），跑完会打醒目横幅 **`23/23  通过`**（条数随套件变）。实现：`e2e/reporters/console.ts`。关色：`CHATAIO_E2E_NO_COLOR=1`。

`@playwright/test` 安装时设 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`，因为测的是仓库里的 Electron，不需要额外 Chromium。

## 观测 Settings 执行

默认 `yarn test:e2e` 大约 1–2 秒跑完一条 Settings 用例，窗立刻关掉，人眼跟不上。社区常见四条路：

| 做法 | 来源 | 本仓怎么用 |
|------|------|------------|
| headed + **slowMo** | [Playwright headed](https://playwright.dev/docs/running-tests#run-tests-in-headed-mode)；[Orca `ORCA_E2E_SLOWMO_MS`](https://github.com/stablyai/orca/blob/main/tests/e2e/helpers/orca-app.ts) | `CHATAIO_E2E_WATCH=1`（默认 slowMo 600ms）。**不要**写进 `electron.launch`：1.62 的 Electron launch **没有** `slowMo` 选项 |
| `locator.highlight()` + 点完再停 | 官方 debug API | `watchClick`：WATCH 时先高亮再点 |
| `page.screencast.showActions({ cursor: 'pointer' })` | Playwright 1.59+ 操作叠加层 | WATCH 时在 Main / Dropdown / Settings Page 上打开；主要服务录屏，现场仍靠高亮 |
| `--debug` / `PWDEBUG` Inspector | [官方推荐](https://github.com/microsoft/playwright/issues/5900) 替代扩 slowMo | `yarn test:e2e -- --debug`，逐步点 Resume |
| `--ui` Trace 时间旅行 | [UI Mode](https://playwright.dev/docs/test-ui-mode) | `yarn test:e2e -- --ui`。Electron 的 trace **常常没有**完整 DOM snapshot（Orca 因此才 opt-in 录视频） |
| 录视频 | Orca `ORCA_E2E_RECORD_VIDEO` | **默认关**。Windows 上 Electron+ffmpeg 收尾易挂（Dyad）；不要为了观测打开默认 video |

命令（仓库根；完整参数见 [`scripts.md`](../../scripts.md)）：

```bash
yarn cross-env CHATAIO_E2E_WATCH=1 playwright test --config projects/ChatAIO/e2e/playwright.config.ts projects/ChatAIO/e2e/tests/settings-open.spec.ts projects/ChatAIO/e2e/tests/settings-wcv-discovery.spec.ts projects/ChatAIO/e2e/tests/settings-ais-save-scopes-ui.spec.ts
```

只跑会动 Settings DOM 的三条：`settings-open`、`settings-wcv-discovery`、`settings-ais-save-scopes-ui`。探针写盘那条（`settings-ais-save-scopes.spec.ts`）几乎没有可见手势，不必盯着看。

看全部用例：同样设 `CHATAIO_E2E_WATCH=1` 再跑 `yarn test:e2e`。单文件：

```bash
yarn cross-env CHATAIO_E2E_WATCH=1 playwright test --config projects/ChatAIO/e2e/playwright.config.ts projects/ChatAIO/e2e/tests/settings-ais-save-scopes-ui.spec.ts
```

环境变量（均可单独用，不必开 WATCH）：

| 变量 | WATCH=1 时默认 | 作用 |
|------|----------------|------|
| `CHATAIO_E2E_WATCH` | — | 高亮、叠加层、把主窗提到前台、打开 trace |
| `CHATAIO_E2E_SLOWMO_MS` | 600 | 每个 `watchClick` 前/后停这么久 |
| `CHATAIO_E2E_HOLD_MS` | 2000 | `close` 前停住，看最后一帧 |

CI / 日常全量保持 `yarn test:e2e`，WATCH 为 0。不要在观测时用鼠标去点正在跑的窗（会抢 Playwright 的指针）。

单步：`yarn test:e2e -- --debug projects/ChatAIO/e2e/tests/settings-ais-save-scopes-ui.spec.ts`。WATCH 跑完的 trace 在 `projects/ChatAIO/e2e/test-results/`，可用 `yarn playwright show-trace <zip>`。

## 目录

| 路径 | 职责 |
|------|------|
| `projects/ChatAIO/e2e/reporters/console.ts` | 终端报告：按 spec 分组、结尾 N/N 通过 |
| `projects/ChatAIO/e2e/global-setup.ts` | 检查 / 补齐 webpack 产物 |
| `projects/ChatAIO/e2e/fixtures.ts` | `electronApp` / `mainWindow`；`userAisPatch` 只给单独用例覆盖写 seed |
| `projects/ChatAIO/e2e/support/app-probe.ts` | 快照 / `waitForSettingsPage` / `openSettingsFromApplicationMenu` |
| `projects/ChatAIO/e2e/support/e2e-ais.ts` | 返回用户 fixture 表（4 页 + deletedIds）；`patchCharliePreloadOnStartup` |
| `projects/ChatAIO/e2e/support/switch-ai.ts` | 打开 Switch AI / Current AI、读序、Prev/Next、右键拖 |
| `projects/ChatAIO/e2e/support/settings-ui.ts` | Manage AIs / 页脚 locator |
| `projects/ChatAIO/e2e/support/user-ais-file.ts` | 读隔离 userData 的 `user-ais.json` |
| `projects/ChatAIO/e2e/support/observe.ts` | WATCH / slowMo / highlight / 关窗前停住 |
| `projects/ChatAIO/e2e/support/launch.ts` | `_electron.launch`、env、按 pid 关闭 |
| `projects/ChatAIO/e2e/support/app-lifecycle.ts` | 关窗退进程 / 单实例：等 pid 树自己死；禁止默认 fixture |
| `projects/ChatAIO/e2e/tests/*.spec.ts` | 用例 |
| `src/Main/foundation/e2e-bootstrap.ts` | **index.ts 第一个 import**，赶在 before-launch 依赖图之前挂收集器 |
| `src/Main/foundation/e2e-mode.ts` | `CHATAIO_E2E` 闸门 |
| `src/Main/foundation/e2e-faults.ts` | uncaught / dialog.showErrorBox / process-gone / preload-error → 内存 + jsonl |
| `src/Main/foundation/e2e-probe.ts` | 主进程快照；`enabledAIIds` / `persistedAIIds` / `instantiatedAIIds`；`getSettings` / `applySettings` / `applyAIs` / `updateAI` |

## 当前用例（按工程文档选的）

| 文件 | 覆盖 | 文档 |
|------|------|------|
| `launch.spec.ts` | 返回用户冷启动 menubar visual-ready | menubar-cold-start-monitor |
| `guiding-first-launch.spec.ts` | 首启 GuidingView | GuidingView |
| `menubar-current-ai.spec.ts` | 中区 badge 下拉切 AI | menubar-current-ai-dropdown |
| `ai-order-surfaces.spec.ts` | Switch AI / Current AI 下拉序 = 磁盘 enabled；disabled 不出现 | ai-list-reorder |
| `ai-page-walk.spec.ts` | Next/Previous AI Page 按 enabled 序环切 | ai-list-reorder |
| `ai-opened-walk.spec.ts` | Next Opened 只走已打开页，不会落到未实例化页 | ai-list-reorder |
| `ai-preload-opened-walk.spec.ts` | 单独覆盖写 Charlie preload：冷启动 instantiated 含 C | ai-list-reorder |
| `ai-enable-draft-no-jump.spec.ts` | 只拨 Enabled 不 Save：行不跳分区，菜单仍无 Bravo | manage-ais-table-ux |
| `ai-enable-save-walk.spec.ts` | 启用 Bravo + 表底 Save 后菜单与 Next AI Page 插入原下标 | ai-list-reorder |
| `ai-reorder-switch-ai.spec.ts` | 右键拖 Switch AI：松手写盘；重排后环切跟新序 | ai-list-reorder |
| `ai-reorder-current-ai.spec.ts` | Current AI 下拉右键拖，契约与 Switch AI 相同 | menubar-current-ai-dropdown |
| `ai-reorder-manage-ais.spec.ts` | 表内左键拖启用行：disabled 钉位、表底不亮 | manage-ais-table-ux |
| `ai-reorder-echo-settings.spec.ts` | Settings 开着时 menubar 重排：表跟新序、不盖 Enabled 草稿 | ai-list-reorder |
| `manage-ais-filter.spec.ts` | 列筛选不计 dirty / 不写盘；空表 portal Input 仍可输入 | manage-ais-table-ux |
| `settings-open.spec.ts` | Application → Settings，badge 变静态；关掉后可再切 AI | menubar-current-ai-dropdown 不变量 6 |
| `settings-exit-without-save.spec.ts` | Exit Without Save 丢主题草稿、保留 Enabled 草稿 | settings-exit-discard |
| `settings-wcv-discovery.spec.ts` | 打开 Settings 后 `windows()` 含 Settings WCV Page | e2e-playwright / playwright#39427 |
| `settings-ais-save-scopes.spec.ts` | `apply-settings` 不写 AIs；`apply-ais` 写启用列；`update-ai` 单条改名且丢掉 `disabled` | manage-ais-save-scopes |
| `settings-ais-save-scopes-ui.spec.ts` | 页脚 vs 表底 dirty、弹窗 Save/Cancel、Undo/Discard、Startup、目录挡板、Add、Clone、表底 Save | manage-ais-save-scopes |
| `settings-ais-pending-delete.spec.ts` | 待删除表底 Save 去掉页；Undo 不写盘 | manage-ais-save-scopes |
| `prompt-toggle.spec.ts` | View → Left Prompt Showcase | prompt-view |
| `app-lifecycle.spec.ts` | 关主窗后进程树必须退；同一 userData 第二次启动立刻退出并唤起第一扇 | close-without-tray / single-instance |

不把远程 ChatGPT/Gemini 登录、白屏监控、Windows `forward: true` 放进默认套件。目录远程 check/apply 要 stub GitHub，尚未写。

## 禁止项

- 不要对系统装 Playwright 浏览器或改 `core.symlinks` 以外的 git 配置。
- 不要用 `taskkill /im electron.exe` 清场。
- 不要让 E2E 默认打开 webpack-dev-server。
- 不要把 userData 写进 `test-results/`（会当 artifact 上传）。
- 不要为了点 Settings 把生产 `WebContentsView` 改成 `BrowserWindow`。`windows()` 已经能发现 Settings / AI WCV；远程 AI 站点 DOM 仍然不测。
- 不要把 `CHATAIO_E2E_WATCH` 设进默认 CI / `yarn test:e2e`。观测是本地 opt-in。
- 不要为了看清动作默认打开 `video`（Windows ffmpeg 易卡死收尾）。
- 不要把 `mainWindow.getContentBounds()` 写进函数默认参数：`closed` 会把 `mainWindow` 置 `null`，Prompt 动画 tick 会炸（`Cannot read properties of null (reading 'getContentBounds')`），窗口弹错而测试仍绿。
- 不要只靠 `uncaughtException` 内存数组：进程死了或主线程被原生对话框卡住时，`evaluate` 读不到。必须写 jsonl。
- 不要在 E2E 里真弹 `showErrorBox`：Playwright 点不掉，后续探针也会挂死。
