# ChatAIO npm 脚本

本工程日常命令从 **monorepo 根**（`electron-reaxes-react/`）执行。`projects/ChatAIO/package.json` 里的同名 script 只是 `yarn --cwd ../..` 转调根目录工具链，参数与根脚本一致。

更细的产品行为（E2E 不变量、图标布局、目录签名）仍以对应 `docs/` 为准；本文只记录**真实可执行命令和源码里存在的参数**。

---

## 本工程要用哪些脚本

Yarn lockfile 是 **v1**。包管理只用 Yarn，不要 `npm i`。Git / `tsc` / 下面这些命令一律在仓库根跑（或从本目录 `yarn <name>` 转调根）。

### `package.json` 里保留的常用入口

根 [`package.json`](../../package.json) 与本目录 [`package.json`](./package.json) 对齐后只暴露这些 ChatAIO 入口：

| 脚本 | 做什么 | 谁会用 |
|------|--------|--------|
| `yarn start:webpack` | development：编 renderer/preload/main，并起 HTTPS webpack-dev-server | 每天开发（先开） |
| `yarn start:electron` | 用仓库里的 Electron 二进制加载本工程 `dist/` | 每天开发（后开） |
| `yarn build:webpack` | production webpack，产物进 `projects/ChatAIO/dist/` | E2E、打安装包之前 |
| `yarn build:electron` | electron-builder 打当前宿主平台安装包，输出 `__Bin/` | 出包 |
| `yarn build` | 上面两步串起来 | 出完整包 |
| `yarn test` | Node 自带 test runner 跑 `projects/ChatAIO/tests/` | 改排序 / 目录 / dirty / menubar 裁决 |
| `yarn test:e2e` | Playwright 打 unpackaged Electron | 改主壳 / Settings / Guiding |

根目录另外还有 **安装 / 新机 / 换图标** 和其它子工程的脚本，见文末。那些不是 ChatAIO `package.json` 的字段，但本工程会用到。

平台别名（`build:electron:win` 等）、E2E 观测别名（`test:e2e:watch` 等）、目录签名 / 性能分析，**不再占 script 字段**。完整命令在对应章节。

### 技术栈（与脚本直接相关）

| 层 | 本仓实际用的 |
|----|----------------|
| 编排 | 根 `scripts/webpack.start`、`webpack.build`、`electron.start`、`electron.build`；参数解析在 `engine/toolkit/entrance.ts` |
| 打包 | webpack 5 + webpack-dev-server 5（renderer HTTPS）；main/preload 走 webpack watch 或一次性 compile |
| 运行 | Electron **41.10.2**（`electron-builder.yml` 的 `electronVersion` 与根 `devDependencies.electron` 一致） |
| 安装包 | electron-builder **^26.15.6**，配置 `projects/ChatAIO/electron-builder.yml` |
| 单测 | `tsx --test`（Node test runner），必须 `--tsconfig projects/ChatAIO/tsconfig.json` 才能解析 `#shared/*` / `#main/*` |
| E2E | `@playwright/test` **^1.62.1**，config 为 `projects/ChatAIO/e2e/playwright.config.ts`；测的是 `node_modules/electron` 里的二进制，不是 Playwright 下载的 Chromium |
| 目录发布 | `gh release`（`publish-ai-catalog.ts`） |
| 换图标 | 根 `scripts/replace-app-icons/replace-app-icons.py`（跨平台）；本目录 `scripts/generate-icons.sh` 仅 macOS `sips`/`iconutil` |

---

## Yarn 1 怎么把参数传进去

根仓库是 Yarn classic（`yarn.lock` 头是 `yarn lockfile v1`）。

- 推荐：`yarn <script> -- <额外参数>`。Yarn 1 常常把中间的 `--` 吃掉，后面的 token 会直接出现在 `process.argv`。
- `scripts/electron.build/index.ts` 为此做了两套识别：先找 argv 里的 `--`，再扫 `ChatAIO` 之后是否出现平台短名单（见「electron-builder」节）。
- 短名单以外的 electron-builder 参数，若只靠 `yarn build:electron --publish never`，**不会**被 wrapper 认领，会回落到「当前宿主平台」默认。需要时用下面的 `yarn tsx ... -- ...` 完整命令，并看日志 `[ElectronBuild] electron-builder ...` 是否真的带上了这些参数。

从本目录跑与从根跑等价：

```bash
# 仓库根
yarn start:webpack

# 本目录（内部 --cwd 回根）
cd projects/ChatAIO
yarn start:webpack
```

---

## 引擎位置参数（webpack / electron.start 共用）

`engine/toolkit/entrance.ts` 用 `reflect()` 按**正则认领** `process.argv.slice(2)`，**不按固定位置**。同一段字符串可以同时匹配多条规则。

ChatAIO 常用入口实际传入的是：

| 入口 | argv |
|------|------|
| `start:webpack` | `ChatAIO` `4444` |
| `start:electron` | `ChatAIO` |
| `build:webpack` | `ChatAIO` `production` |
| `build:electron` | `ChatAIO`（后面可再跟平台标志） |

### 已实现的匹配规则

源码默认值在 `entrance.ts` 的解构默认里。

| 认领名 | 匹配 | 默认 | ChatAIO 是否依赖 |
|--------|------|------|------------------|
| `project` | `projects/` 下一层目录名，或 `Autohotkey-GUI/War3` 这种带 `/` 的子路径 | `null`（未传会 `console.warn`） | **必须**。路径解析见 `engine/toolkit/project-paths.ts`：`ChatAIO` → `projects/ChatAIO` |
| `inputPort` | `0–65535` 的整数字符串 | `3333` | **webpack.start 要传 `4444`**。随后 `getPort()`（`engine/utils/index.ts`）用 `portfinder` 从该端口起找空闲端口，结果赋给 `port`，再写进 webpack `DefinePlugin` 的 `__DEV_PORT__` |
| `node_env` | `development` / `production` | 字面默认 `'development'` | **webpack.build 传 `production`**，用来选 `engine/webpack` 的 prod conf、关掉 watch |
| `method` | `build` / `server` | `'server'` | ChatAIO 的 npm 脚本**没有**传 `build`。`webpack.build/index.ts` 自己做一次性 compile，不靠这个 token 切换 |
| `env` | `server_dev` / `server_production` | `'unset'` | 打进 `__ENV__`。ChatAIO 常用入口不传 |
| `mock` | 单词 `mock` | `null` → `__IS_MOCK__` 为 `'false'` | 常用入口不传 |
| `experimental` | 单词 `experimental`（忽略大小写） | `'non-exp'` → `__EXPERIMENTAL__` 为 `false` | 常用入口不传 |
| `analyze` | 单词 `analyze` | `false` | **目前没有效果**：`engine/webpack/dev.conf.ts` 里 `BundleAnalyzerPlugin` 是注释掉的。传了只会在 entrance 的 purdy 日志里出现 |
| `runtime` | 源码正则是 `/\bweb\|electron\|andriod-webview\|\b/i`（`andriod` 是源码拼写） | `'web'` | ChatAIO 常用入口不传 `electron`。该正则末尾有 `\|\b`，任意单词都可能被 `test()` 判真，从而把 `runtime` 写成那个 argv token。后续流程主要靠 `project` + `node_env`，不要把 `runtime=electron` 当成必填 |

未传 `project` 时 `getProjectPaths()` 会在 `subProject.endsWith('/')` 处对 `null` 出问题。所以根 `start:webpack` / `start:electron` **已经写死 `ChatAIO`**（与原来的 `build:webpack` 一致）。其它子工程继续用根上的 `webpack-start:*` / `electron-start:*`。

手写等价命令：

```bash
yarn tsx scripts/webpack.start/index.ts ChatAIO 4444
yarn tsx scripts/electron.start/index.ts ChatAIO
yarn tsx scripts/webpack.build/index.ts ChatAIO production
```

---

## 开发：`start:webpack` / `start:electron`

必须两个终端，先 webpack 再 Electron。`electron.start` 会检查 `dist/main.js`、`preload.js`、`ai-page-preload.js` 相对源码是否过期（`scripts/utils/build-artifacts.ts`），不新鲜就直接 `exit 1`。

### webpack.start 实际做的事

`scripts/webpack.start/index.ts`：

1. 清空并重置该工程 `dist/` 与 build-state（标签 `webpack-start`）
2. 起 renderer 的 `WebpackDevServer`（有 renderer conf 才起）
3. 再编 preload、再编 main（development 下 webpack `watch: true`）

DevServer 配置在 `engine/webpack/devserver.ts`（不是猜测）：

| 项 | 值 |
|----|----|
| `port` | entrance 解析后再经 portfinder 的 `port` |
| `host` | `0.0.0.0` |
| `server.type` | `https` |
| 证书 | `engine/cert/127.0.0.1+5.pem` 与对应 `-key.pem` |
| `hot` | `true` |
| `devMiddleware.writeToDisk` | `true`（Electron 也能读到落盘的 preload/main） |
| `historyApiFallback` | 首段路径 → `/<entry>/index.html` |

启动成功时 stdout 会打印 `WDS已启动在https://<本机IPv4>:<port>`。Main 加载本地 View 用的是 **`https://localhost:${__DEV_PORT__}/<Entry>/`**（`src/Main/services/dev/renderer-entry.ts`），不是那条 IPv4 日志。

ChatAIO renderer 入口清单在 `src/shared/renderer-entries.ts`：`SettingsView`、`FloatingView`、`GuidingView`、`PromptView`、`MainView`、`DropdownView`。E2E 的 `global-setup.ts` 还检查这些 `dist/renderer/<Entry>/index.html` 是否存在。

`shouldUseDevRendererServer()`（`src/Main/foundation/e2e-mode.ts`）为：`electron-is` 的 `dev()` 为真，且 `CHATAIO_E2E !== '1'`。日常 `start:electron` 走 WDS；E2E 走 `dist/renderer/*/index.html` 文件。

### electron.start 实际做的事

`scripts/electron.start/index.ts` **没有**自己的 CLI 开关。它：

- 解析 `node_modules/electron` 里的二进制（Win: `electron.exe`；macOS: `Electron.app/Contents/MacOS/Electron`；Linux: `electron`）
- `cwd` = `projects/ChatAIO`
- argv：`.` 、 `--inspect=9229` 、 `--experimental-network-inspection`
- 额外 env：`NODE_OPTIONS=--enable-source-maps`、`NODE_TLS_REJECT_UNAUTHORIZED=0`（只覆盖 Node TLS；Chromium 还靠 `electron.conf.ts` 里的 `ignore-certificate-errors`）

**没有**传 `--remote-debugging-port`。renderer CDP **9222** 要另开环境变量（见下）。9229 是 Node inspector（main），不是 Playwright `connectOverCDP` 用的端口。细节见 [`docs/issues/google-ai-studio-available-regions-redirect.md`](./docs/issues/google-ai-studio-available-regions-redirect.md)。

### 开发期环境变量（ChatAIO Main，不是 npm 参数）

| 变量 | 源码 | 作用 |
|------|------|------|
| `CHATAIO_REMOTE_DEBUG=1` | `src/Main/foundation/electron.conf.ts` | unpackaged 时才追加 Chromium `remote-debugging-port=9222` 和 `remote-allow-origins=*`。默认关闭（BotGuard 信号） |
| `CHATAIO_CATALOG_REMOTE_JSON` + `CHATAIO_CATALOG_REMOTE_SIG` | `ai-catalog-update-runtime.utility.ts` | 两个都指向本地已签名文件时，目录检查读盘，不拉 GitHub。维护者预览用 |
| `CHATAIO_E2E=1` | `e2e-mode.ts` | **不要**加在日常 `start:electron` 上。这是 Playwright launch 写进去的闸门 |

---

## 生产 webpack：`build:webpack`

`scripts/webpack.build/index.ts` 并行编 renderer / preload / main（没有的 conf 会 skip）。`node_env=production` 时 `mixedRepoWebpackConf.ts` 合并 prod conf 并 `watch: false`。

产物：`projects/ChatAIO/dist/`（`main.js`、`preload.js`、`ai-page-preload.js`、`renderer/<Entry>/`）。**这不是 exe**。exe / dmg / AppImage 是下一步 `build:electron`。

E2E `global-setup.ts`：缺上述文件时会在仓库根执行 `yarn build:webpack`。它**不**按 mtime 增量编译；改了 `src/Main` 或 Settings renderer 之后要自己先 `yarn build:webpack`，否则会跑旧 `dist` 假绿。

只检查不构建：

```bash
# cmd
set CHATAIO_E2E_SKIP_BUILD=1
yarn test:e2e

# PowerShell
$env:CHATAIO_E2E_SKIP_BUILD='1'
yarn test:e2e
```

`CHATAIO_E2E_SKIP_BUILD` 只在 `e2e/global-setup.ts` 里读取。

---

## 安装包：`build:electron` / `build`

配置文件：[`electron-builder.yml`](./electron-builder.yml)。wrapper：`scripts/electron.build/index.ts`。cwd 是 `projects/ChatAIO`。

### wrapper 在调用 electron-builder 之前

1. 删掉 `projects/ChatAIO/__Bin`（路径写死，拒绝删别的目录）
2. Windows 上用 LockHunter `/unlock` 解占用：env `LOCKHUNTER_PATH` 或 `LOCKHUNTER_EXE`，否则找安装位置（`scripts/utils/windows-path-unlock.ts`）
3. 成功后 Windows 再 `ie4uinit.exe -show` 刷新图标缓存

### wrapper 传给 electron-builder 的参数

`getElectronBuilderArgs()`：

1. argv 里有 `--` → 取其后面**全部** token（可原样透传官方 CLI）
2. 否则从 `process.argv.slice(3)` 过滤**短名单**：`--mac` `--win` `--linux` `-m` `-w` `-l` `--arm64` `--x64`（`startsWith` 匹配，因此 `--win` 能过，`--publish` **不能**）
3. 都没有 → 当前宿主：`win32` → `build -w`；`darwin` → `build -m`；其它 → `build -l`

本仓 `electron-builder` 是 **26.x**。官方 CLI（[electron.build/cli](https://www.electron.build/cli)）还包括 `--ia32`、`--armv7l`、`--universal`、`--dir`、`-p/--publish` 等；这些只有走第 1 路（`--` 后面整段透传）才会进 electron-builder。ChatAIO yml **没有**配 ia32；Electron 41 的 Windows 目标在 yml 里是 `nsis` + `x64`。

`electron-builder.yml` 里的目标（未传 CLI 覆盖时）：

| 平台 | `electron-builder.yml` |
|------|-------------------------|
| mac | `dmg` + `zip`，arch `x64` 与 `arm64` |
| win | `nsis`，arch `x64` |
| linux | `AppImage`，arch `x64` |

其它 yml 事实：`directories.output` = `__Bin`；`files` 只收 `dist/`；`extraResources` 复制 `statics/` 但排除两张 `icons/main-icon-900x900*.png`；`publish.provider=github`，owner/repo = `Kane-Kuroneko/ChatAIO-Releases`；`artifactName` = `${productName}-${version}-${os}-${arch}.${ext}`。

wrapper **不会**自动加 `--publish never`。是否上传取决于你是否把 `--publish ...` 成功透传到 electron-builder（见上节 Yarn 1）。本地出包若要禁止发布，用完整 tsx 命令并核对那行 `[ElectronBuild] electron-builder ...`：

```bash
yarn tsx scripts/electron.build/index.ts ChatAIO -- --win --publish never
```

跨平台（仍受 electron-builder 交叉编译限制；mac 目标通常要在 macOS 上打）：

```bash
yarn tsx scripts/electron.build/index.ts ChatAIO -- --mac
yarn tsx scripts/electron.build/index.ts ChatAIO -- --win
yarn tsx scripts/electron.build/index.ts ChatAIO -- --linux
yarn tsx scripts/electron.build/index.ts ChatAIO -- --mac --arm64
```

`yarn build` = `build:webpack` 然后 `build:electron`（当前宿主平台）。先 webpack 再生产包，否则 `__Bin` 里会是旧 `dist`。

---

## 单元测试：`yarn test`

```bash
# 仓库根或本目录
yarn test
```

展开后：

```bash
yarn tsx --tsconfig projects/ChatAIO/tsconfig.json --test projects/ChatAIO/tests/ai-list-reorder.test.ts projects/ChatAIO/tests/manage-ais-table-ux.test.ts projects/ChatAIO/tests/settings-dirty-scopes.test.ts projects/ChatAIO/tests/menubar-cold-start-verdict.test.ts projects/ChatAIO/tests/ai-catalog-defaults.test.ts projects/ChatAIO/tests/ai-catalog-merge.test.ts projects/ChatAIO/tests/ai-catalog-sign.test.ts projects/ChatAIO/tests/ai-catalog-update.test.ts projects/ChatAIO/tests/close-without-tray-process-lingers.test.ts
```

`--tsconfig` 指向本工程 tsconfig，因为测试 import `#shared/*`、`#main/*`（见 `projects/ChatAIO/tsconfig.json` 的 `paths`）。`--test` 是 tsx 交给 Node test runner 的开关。

**不要**把目录 `projects/ChatAIO/tests` 直接丢给 `tsx --test`：tsx 会把它当 ESM 入口去找 `tests/index.json` 然后 `ERR_MODULE_NOT_FOUND`。`package.json` 的 `test` 因此显式列出下面这些文件（本目录当前全部 `.test.ts`）：

| 文件 | 覆盖 |
|------|------|
| `ai-list-reorder.test.ts` | Switch AI / Manage AIs 顺序契约 |
| `manage-ais-table-ux.test.ts` | 表展示序 / 筛选契约 |
| `settings-dirty-scopes.test.ts` | 页脚 vs 表底 dirty |
| `menubar-cold-start-verdict.test.ts` | menubar 冷启动裁决纯函数 |
| `ai-catalog-defaults.test.ts` | 目录默认值 |
| `ai-catalog-merge.test.ts` | 目录合并 |
| `ai-catalog-sign.test.ts` | 验签 |
| `ai-catalog-update.test.ts` | 目录更新 |
| `close-without-tray-process-lingers.test.ts` | 禁用托盘后点 X 不得 hide 到托盘 |

只跑一部分时把文件路径写在 `--test` 后面（路径相对**仓库根**）：

```bash
yarn tsx --tsconfig projects/ChatAIO/tsconfig.json --test projects/ChatAIO/tests/ai-list-reorder.test.ts projects/ChatAIO/tests/manage-ais-table-ux.test.ts projects/ChatAIO/tests/settings-dirty-scopes.test.ts
```

以前的 `test:ai-order` / `test:ai-catalog` / `test:menubar-boot` 就是上面这些文件的子集，现已并进 `yarn test`。

---

## E2E：`yarn test:e2e`

配置：`e2e/playwright.config.ts`。设计文档：[`docs/features/e2e-playwright.md`](./docs/features/e2e-playwright.md)。

config 里写死的事实：

- `testDir` = `e2e/tests`，`testMatch` = `.*\.spec\.ts`
- `workers: 1`，`fullyParallel: false`
- `timeout` 120s，`expect.timeout` 20s，`use.actionTimeout` 15s
- `retries`：`process.env.CI` 有值时为 2，否则 0
- `forbidOnly`：CI 下为 true
- reporter：自研 `e2e/reporters/console.ts` + HTML（`e2e/playwright-report`，`open: never`）
- `trace`：`CHATAIO_E2E_WATCH===1` 时 `on`，否则 `retain-on-failure`
- `screenshot`：`only-on-failure`；`video`：`off`（Windows 上 Electron+ffmpeg 收尾易挂）

`e2e/support/launch.ts` 给被测进程设置：

- `CHATAIO_E2E=1`
- `CHATAIO_E2E_USER_DATA_DIR` = `os.tmpdir()` 下 `chataio-e2e-` 前缀的 mkdtemp（禁止写本机 `%APPDATA%/ChatAIO-dev`）
- `ELECTRON_DISABLE_SECURITY_WARNINGS=true`
- 仅 `mode==='first-launch'` 的用例设 `CHATAIO_E2E_FIRST_LAUNCH=1`（GuidingView）
- `executablePath` 为仓库 Electron；`args` 为 ChatAIO 工程根；timeout 120s

### 追加 Playwright CLI（常用入口透传）

`test:e2e` 本身就是 `playwright test --config projects/ChatAIO/e2e/playwright.config.ts`。后面可以接 Playwright 自己的 CLI。本仓文档和旧 script 用过的：

```bash
# 有窗（unpackaged Electron 本来就有窗，几乎看不出差别）
yarn test:e2e -- --headed

# Inspector，逐步 Resume
yarn test:e2e -- --debug
yarn test:e2e -- --debug projects/ChatAIO/e2e/tests/settings-ais-save-scopes-ui.spec.ts

# UI Mode（Electron 的 trace 常常没有完整 DOM snapshot）
yarn test:e2e -- --ui
```

单文件 / 多文件（路径相对仓库根，与旧 `test:e2e:settings:watch` 相同）：

```bash
yarn test:e2e -- projects/ChatAIO/e2e/tests/settings-open.spec.ts
```

当前 spec：`launch`、`guiding-first-launch`、`menubar-current-ai`、`ai-order-surfaces`、`ai-page-walk`、`ai-opened-walk`、`ai-preload-opened-walk`、`ai-enable-draft-no-jump`、`ai-enable-save-walk`、`ai-reorder-switch-ai`、`ai-reorder-current-ai`、`ai-reorder-manage-ais`、`ai-reorder-echo-settings`、`manage-ais-filter`、`settings-open`、`settings-exit-without-save`、`settings-wcv-discovery`、`settings-ais-save-scopes`、`settings-ais-save-scopes-ui`、`settings-ais-pending-delete`、`prompt-toggle`。完整表见 [`docs/features/e2e-playwright.md`](./docs/features/e2e-playwright.md)。

### 观测执行（旧 `test:e2e:watch` / `test:e2e:settings:watch`）

这些不是 Playwright 的 `--watch`。本仓用环境变量，实现于 `e2e/support/observe.ts` 与 config 的 `trace`。

| 变量 | 何时读 | 默认 |
|------|--------|------|
| `CHATAIO_E2E_WATCH=1` | `isE2EWatch()`；WATCH 时开 highlight、screencast 操作叠加、把主窗提到前台、trace=`on` | 关 |
| `CHATAIO_E2E_SLOWMO_MS` | 每个 `watchClick` 前/后暂停的毫秒。WATCH 时默认 **600**，否则 **0**。必须是有限数字，否则回退默认并 warn |
| `CHATAIO_E2E_HOLD_MS` | `close` 前再停。WATCH 时默认 **2000**，否则 **0** |
| `CHATAIO_E2E_DEBUG=1` | `e2e/support/faults.ts`：把 Electron stdout/stderr 打到当前终端 |
| `CHATAIO_E2E_NO_COLOR=1` | `e2e/reporters/console.ts` 关 ANSI |
| `CI` | Playwright config 的 retries / forbidOnly（任意非空都会当 CI） |

Playwright 1.62 的 `_electron.launch` **没有** browser 那种 `slowMo` 选项，所以慢动作只能走上面的 env。不要把 `CHATAIO_E2E_WATCH` 设进默认 CI。

```bash
# 全量观测（Yarn 1 / cross-env，Windows 友好）
yarn cross-env CHATAIO_E2E_WATCH=1 playwright test --config projects/ChatAIO/e2e/playwright.config.ts

# 只盯 Settings DOM 三条（旧 test:e2e:settings:watch）
yarn cross-env CHATAIO_E2E_WATCH=1 playwright test --config projects/ChatAIO/e2e/playwright.config.ts ^
  projects/ChatAIO/e2e/tests/settings-open.spec.ts ^
  projects/ChatAIO/e2e/tests/settings-wcv-discovery.spec.ts ^
  projects/ChatAIO/e2e/tests/settings-ais-save-scopes-ui.spec.ts
```

PowerShell 等价：

```powershell
$env:CHATAIO_E2E_WATCH='1'
yarn test:e2e -- projects/ChatAIO/e2e/tests/settings-open.spec.ts `
  projects/ChatAIO/e2e/tests/settings-wcv-discovery.spec.ts `
  projects/ChatAIO/e2e/tests/settings-ais-save-scopes-ui.spec.ts
```

WATCH 留下的 trace 在 `projects/ChatAIO/e2e/test-results/`。查看：`yarn playwright show-trace <zip>`（Playwright 自带 CLI，不是本仓 script）。

`e2e/package.json` 只有 `name` / `private` / `type: module`，**没有** scripts。

---

## 性能日志分析（旧 `analyze:perf`）

脚本：`projects/ChatAIO/scripts/analyze-perf-logs.ts`。日志目录默认 `__dirname/../performance-logs`，即 `projects/ChatAIO/performance-logs/`。只收 `perf-*.jsonl`，默认跳过 `perf-fixture-*`。

```bash
yarn tsx --tsconfig projects/ChatAIO/tsconfig.json projects/ChatAIO/scripts/analyze-perf-logs.ts
yarn tsx --tsconfig projects/ChatAIO/tsconfig.json projects/ChatAIO/scripts/analyze-perf-logs.ts --latest
yarn tsx --tsconfig projects/ChatAIO/tsconfig.json projects/ChatAIO/scripts/analyze-perf-logs.ts --ci
yarn tsx --tsconfig projects/ChatAIO/tsconfig.json projects/ChatAIO/scripts/analyze-perf-logs.ts --dir D:\logs
```

| 参数 | 源码 | 行为 |
|------|------|------|
| `--ci` | `args.includes('--ci')` | 跑完后用 `CI_THRESHOLDS` 检查，超标 `exit 1` |
| `--latest` | `args.includes('--latest')` | 只分析最新一条非 fixture |
| `--dir <path>` | `--dir` 的下一个 argv | `path.resolve` 后当日志目录；报告仍写到该目录下 `analysis-reports/` |

`--ci` 阈值写在 `src/shared/utils/perf-log-analyzer.utility.ts` 的 `CI_THRESHOLDS`（单位 ms，P1 为个数）：

| 键 | 值 |
|----|----|
| `maxAvgMainOverhead` | 30 |
| `maxSingleMainOverhead` | 100 |
| `maxCloseOverhead` | 80 |
| `maxCloseExitDuration` | 1000 |
| `maxP1Anomalies` | 10 |

输出：`analysis-reports/analysis-<timestamp>.md` 与对应 `.json`。没有 `--help`；未识别的 token 会被忽略。

---

## menubar 冷启动日志（旧 `analyze:menubar-boot`）

脚本：`projects/ChatAIO/scripts/analyze-menubar-cold-start.ts`。读 jsonl，打印最后一条 `type==='verdict'`；没有则用 `computeMenubarColdStartVerdict(events)`。

```bash
yarn tsx --tsconfig projects/ChatAIO/tsconfig.json projects/ChatAIO/scripts/analyze-menubar-cold-start.ts
yarn tsx --tsconfig projects/ChatAIO/tsconfig.json projects/ChatAIO/scripts/analyze-menubar-cold-start.ts -- path/to/menubar-cold-start.jsonl
```

位置参数：`process.argv.slice(2)` 里第一个**不等于** `--` 的 token 当文件路径。未传则按顺序找已存在的：

1. `<cwd>/logs/menubar-cold-start.jsonl`
2. `<cwd>/projects/ChatAIO/logs/menubar-cold-start.jsonl`
3. 脚本旁 `../logs/menubar-cold-start.jsonl`

三个都不存在时用第 1 个路径去读，然后抛 `log not found`。

纯函数回归已包含在 `yarn test` 的 `menubar-cold-start-verdict.test.ts`。

---

## 供应商目录签名 / 发布（旧 `sign:ai-catalog` / `publish:ai-catalog`）

工作文件在 `statics/ai-catalog/`：`default-ais.json`、`default-ais.json.sig`、`ed25519.pub`。远程是 `Kane-Kuroneko/ChatAIO-Releases` 的 tag `ai-catalog`（常量在 `src/Main/services/settings/utils/ai-catalog-sign.utility.ts`）。

### 签名

```bash
yarn tsx --tsconfig projects/ChatAIO/tsconfig.json projects/ChatAIO/scripts/sign-ai-catalog.ts
```

**没有 CLI 参数。** 私钥来源（先环境变量，再文件）：

| 来源 | 说明 |
|------|------|
| `CHATAIO_CATALOG_ED25519_PRIVATE_KEY` | PEM 全文；`\\n` 会替换成换行 |
| `CHATAIO_CATALOG_ED25519_PRIVATE_KEY_FILE` | 私钥路径 |
| 默认文件 | `~/.chataio/ai-catalog-ed25519.key`（`os.homedir()`） |

拒绝签名的情况（脚本内写死）：JSON 含 CR（`0x0d`）；`ais` 不是数组；行里出现实例字段 `disabled` / `proxy_mode` / `preloadOnStartup` / `url_override`；签完对 `ed25519.pub` 自验失败。

### 发布

```bash
yarn tsx --tsconfig projects/ChatAIO/tsconfig.json projects/ChatAIO/scripts/publish-ai-catalog.ts
```

**没有 CLI 参数。** 依赖本机已登录、对该仓有写权限的 `gh`。脚本自己会：

1. 本地验签，失败则拒传
2. `gh release view ai-catalog`；没有则 `gh release create ... --latest=false`
3. `gh release upload ... --clobber`
4. 再 `gh release edit ... --latest=false`

「必须 `--latest=false`」指的是 **gh 子命令里已经写死的标志**，不是再给 npm script 传一遍。不要把 `ai-catalog` 标成 GitHub Latest（electron-updater 会去拉 `ai-catalog/latest.yml` 并 404）。见 [`docs/features/ai-catalog-manual-update.md`](./docs/features/ai-catalog-manual-update.md)。

---

## 图标

跨平台换图（Windows 也走这条），**不要**手改 `.ico` / `.icns`：

```bash
yarn replace-app-icons -- "<PNG绝对路径>" --project ChatAIO
```

参数以根 [`scripts/replace-app-icons/AGENTS.md`](../../scripts/replace-app-icons/AGENTS.md) 为准（该文件与 `.py` 同源）：`source` 必须是绝对路径；`--project` 默认 ChatAIO；`--variant prod|dev`；`--dry-run`；`--list-projects`。

仅 macOS、从 `statics/icons/main-icon-900x900.png` 生成 icns / Linux png / tray template：

```bash
bash projects/ChatAIO/scripts/generate-icons.sh
bash projects/ChatAIO/scripts/generate-icons.sh --no-clean
```

`--no-clean` 是该 bash 脚本**唯一**识别的参数（`$1`）。需要 `sips`、`iconutil`、`python3` + Pillow。布局见 [`docs/architecture/app-icons.md`](./docs/architecture/app-icons.md)。

---

## 类型检查（不是 npm script）

架构规则里的门禁，从未挂到 `package.json`：

```bash
# 仓库根，Windows
.\node_modules\.bin\tsc.cmd -p projects\ChatAIO\tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p projects\ChatAIO\src\Views\SettingsView\tsconfig.json --noEmit
```

已知 caveat：现有 tsconfig 可能冒出与本次改动无关的 `typeRoots` / generic-services 报错。需要时加 `--typeRoots .\node_modules\@types --skipLibCheck`。

---

## 根仓库：本工程也会碰到的 script

这些在**根** `package.json`，ChatAIO 子 `package.json` 不再重复。

| 脚本 | 展开 | 参数 |
|------|------|------|
| `yarn` / `postinstall` | `tsx scripts/postinstall/index.ts && patch-package` | 无。postinstall 会 `npx electron-rebuild -f -w better-sqlite3`（给其它子工程的 native 模块；ChatAIO 自己的 `package.json` 没有这个依赖）然后跑 `patch-package` |
| `yarn setup:git-symlinks` | `tsx scripts/setup-git-symlinks.ts` | `--restore`：对已退化成普通文件的已跟踪软链执行 `git checkout --`。未加时只报告并 `exit 1` |
| `yarn replace-app-icons` | 见上一节 | 见 AGENTS.md |

`setup:git-symlinks --restore` 完整命令（根 `AGENTS.md` 也写了这条，与 npm 入口等价）：

```bash
yarn tsx scripts/setup-git-symlinks.ts --restore
```

根上仍保留其它子工程快捷脚本（`webpack-start:ahk-war3` 等），**不是 ChatAIO 日常路径**。War3 的 webpack.start 传的是 `Autohotkey-GUI/War3 4444`；AI-WebTools 的 start **没有**写端口，走 entrance 默认 `3333` 再 portfinder。

---

## 旧 script 名对照

| 已移除的 npm 名 | 现在怎么跑 |
|-----------------|------------|
| `build:electron:win` / `build:win` | `yarn tsx scripts/electron.build/index.ts ChatAIO -- --win`（要带 webpack 就先 `yarn build:webpack`） |
| `build:electron:mac` / `build:mac` | 同上，把 `--win` 换成 `--mac` |
| `build:electron:linux` / `build:linux` | `--linux` |
| `test:e2e:headed` | `yarn test:e2e -- --headed` |
| `test:e2e:debug` | `yarn test:e2e -- --debug` |
| `test:e2e:watch` | `yarn cross-env CHATAIO_E2E_WATCH=1 playwright test --config projects/ChatAIO/e2e/playwright.config.ts` |
| `test:e2e:settings:watch` | 同上，再跟上三条 Settings spec 路径 |
| `test:ai-order` / `test:ai-catalog` / `test:menubar-boot` | `yarn test`，或 `--test` 后跟具体 `.test.ts` |
| `analyze:perf` / `analyze:perf:ci` | `analyze-perf-logs.ts`，CI 加 `--ci` |
| `analyze:menubar-boot` | `analyze-menubar-cold-start.ts` |
| `sign:ai-catalog` / `publish:ai-catalog` | 对应 `scripts/*.ts`，无 CLI 参数 |
| `generate-icons` | `bash projects/ChatAIO/scripts/generate-icons.sh` |

---

## 不要做的

- 不要在 `projects/ChatAIO` 里当 git 根执行命令。
- 不要对系统 `npx playwright install` Chromium 来跑本仓 E2E。
- 不要把 `CHATAIO_E2E=1` 配进日常 `start:electron`。
- 不要把目录 Release 标成 GitHub Latest。
- 不要为了「分析包体积」以为传 `analyze` 就会弹出 Bundle Analyzer——插件当前是注释状态。
