# Google AI Studio 跳 available-regions：补丁失效与 agent CDP 接管

## 一句话结论

**2026-08-27 观测**：同一账号、同一出口网络下，系统 Chrome 可正常使用 `https://aistudio.google.com`；ChatAIO 的 AI `WebContentsView` 会被强制送到 [`https://ai.google.dev/gemini-api/docs/available-regions`](https://ai.google.dev/gemini-api/docs/available-regions)。这不是真实地区封锁，而是 MakerSuite **资格/环境校验失败后的通用拒绝落地页**。2026-08 的 `google-chrome-identity` 补丁（剥 Electron UA + 注入 `Google Chrome` Client Hints + 主世界 `userAgentData`/`window.chrome`）**已不足以过这道门**。

**状态**：只调研、不修代码。当前分支在做别的事；落地修复留待日后。后续 debug 应由 agent 经 **两条口** 接管：Chromium CDP（renderer / `WebContentsView`）+ Node inspector（main thread）。只挂 renderer 看不到 session / proxy / identity 补丁。

旧身份补丁仍有效范围见 [google-ai-studio-electron-browser-identity.md](./google-ai-studio-electron-browser-identity.md)（`accounts.google.com` 的「此浏览器或应用可能不安全」）。本文覆盖的是 **另一道、更晚触发的 MakerSuite 资格门**。

---

## 不变量

- 用户对照：**浏览器内正常、ChatAIO 内跳地区页** → 先当环境检测，不当成 IP/账号/年龄问题。
- 官方地区页文案会写 region / 18+ / 年龄验证；这是 **fail-closed 的泛化文案**，不能当根因。
- 不要和 ChatAIO 自己的 [敏感地区访问阻断](../features/sensitive-region-access-blocking.md) 混淆：后者加载的是本地 `data:text/html` 阻断页，URL 不会变成 `ai.google.dev/.../available-regions`。
- `CHATAIO_REMOTE_DEBUG=1` / `remote-debugging-port=9222` **本身就是 BotGuard 信号**。用 CDP 查问题时必须在记录里标明「CDP 开着」；根因对照仍以「无 CDP 的日常使用」为准。
- Agent 不得用 Cursor 自带的 `cursor-ide-browser` MCP 代替 Electron 调试：那是 Cursor 自己的浏览器标签，进不去 ChatAIO 的 `WebContentsView`。
- **9222 ≠ 9229**。`remote-debugging-port=9222` 是 Chromium CDP（所有 renderer）；`--inspect=9229` 是 Node V8 inspector（main）。Playwright `connectOverCDP` 只能吃 9222。Dev 下 `yarn start:electron` **已经**带 `--inspect=9229`（见 `scripts/electron.start/index.ts`）；9222 仍要 `CHATAIO_REMOTE_DEBUG=1`。

---

## 症状

1. 在 ChatAIO 打开 Google AI Studio（内置项或自定义 `https://aistudio.google.com`）。
2. 页面很快被导航到 `https://ai.google.dev/gemini-api/docs/available-regions`。
3. 同一机器、同一 Google 账号、同一网络，用系统 Chrome / Edge 打开 AI Studio **可用**。
4. 旧症状「This browser or app may not be secure」不一定再出现；本次回归的可见结果是 **地区文档页**，不是 Google 登录拒信。

官方页自己列的三种原因（[available-regions](https://ai.google.dev/gemini-api/docs/available-regions)）：

- Regional restrictions
- Age requirements（18+）
- Account verification（未完成年龄验证）

论坛里同一落地页还出现在：账号风控、IP 被错分类、Workspace 策略、资格 RPC 失败。例：

- [discuss 111531](https://discuss.ai.google.dev/t/ai-studio-redirects-me-to-available-regions-for-google-ai-studio/111531)
- [discuss 175152](https://discuss.ai.google.dev/t/ai-studio-redirects-to-available-regions/175152)（同设备同 IP，A 账号失败、B 账号成功）
- [discuss 177290](https://discuss.ai.google.dev/t/google-ai-studio-incorrectly-blocks-access-despite-us-ip-and-valid-account/177290)（美国 IP + 支持地区，仍被重定向；另一台电脑正常）
- [discuss 179490](https://discuss.ai.google.dev/t/bug-account-redirected-to-available-regions-page-belgium-supported-19-years-old-age-verified/179490)（先闪 “Unable to check your Google AI Subscription”，再跳地区页）

这些案例说明：**资格检查失败就会丢到这一页**。ChatAIO vs Chrome 的对照把账号/地区从主因里拿掉。

---

## 和旧补丁的关系

旧补丁目标是 `accounts.google.com` 的「不安全浏览器」门。已落地：

| 层 | 做什么 | 文件 |
| --- | --- | --- |
| 全局 UA | 剥 `Electron/`、`ChatAIO/` | `browser-identity/index.ts` `sanitizeElectronUserAgent` |
| Session 头 | 覆盖 `User-Agent`、`Accept-Language`、`Sec-CH-UA*`（硬编码含 `Google Chrome`） | 同上 `onBeforeSendHeaders` |
| 主世界 JS | 覆盖 `navigator.userAgentData`，填 `window.chrome.app/runtime/loadTimes/csi` | `ai-page-preload.ts` `installGoogleChromeMainWorldIdentity` |
| WebAuthn | 拒绝 `publicKey` + `Permissions-Policy` | preload + `onHeadersReceived` |
| Blink | `disable-blink-features=AutomationControlled` | `electron.conf.ts` |
| Dev CDP | 默认关；`CHATAIO_REMOTE_DEBUG=1` 才开 `9222` | `electron.conf.ts` |

这些对 **OAuth 登录门** 曾经够用。本次是 **AI Studio 控制面资格门**：页面已能加载/可能已登录，随后被 MakerSuite 判定「无法核验资格」，fail-closed 到地区文档。社区里 AI Studio RPC 仍要 **BotGuard snapshot**（[aistudio-api README](https://github.com/chrysoljq/aistudio-api/blob/master/README_EN.md)）；cookie + UA 过了登录也不等于 GenerateContent / 资格 RPC 能过。

---

## 补丁为什么会过时（优先假设，待 CDP 证伪）

按「改动成本低、与 Chrome 对照差最大」排序。**未在本机抓包证实**；日后 agent 接管时按此清单逐项 diff。

### 1. GREASE 品牌写死，和引擎原生 `Sec-CH-UA` 对不上

现行代码两边都写死：

```text
"Chromium";v="<major>", "Google Chrome";v="<major>", "Not_A Brand";v="24"
```

Chromium 120+ 的 GREASE **随 major 旋转**（字符、版本 `8|99|24`、三项顺序都会变）。2026 年真实 Chrome 常见形态是 `"Not(A:Brand";v="8"` 一类，而不是 `"Not_A Brand";v="24"`。

[tandem-browser PR 180](https://github.com/hydro13/tandem-browser/pull/180) 把同类错误标成 Cloudflare / 反爬在 **任何用户交互之前** 就打满嫌疑的根因，并证明必须：

1. **保留** Chromium 自己发出的 GREASE token，只 **插入** `"Google Chrome"`；
2. 大小写不敏感地删掉全部 `sec-ch-ua*`，避免 `sec-ch-ua`（Electron 原头）和 `Sec-CH-UA`（我们写的）并存——爬虫读小写头，里面仍然只有 `Chromium`，没有 Chrome 品牌；
3. 不要主动发 `Sec-CH-UA-Full-Version-List`：这是高熵 hint，浏览器没被要求时发送本身就是指纹。

ChatAIO 当前三条都踩了：GREASE 写死、`setRequestHeader` 写成 `Sec-CH-UA`、无条件附带 Full-Version-List。

### 2. 主世界 `window.chrome` 形状像补丁，不像 Chrome

`ai-page-preload.ts` 给 `chrome.runtime` 塞了 `connect` / `sendMessage` 对象。真 Chrome 在非扩展页里 **`chrome.runtime` 常为 `undefined`**；做成对象反而是 Electron stealth 的经典破绽（[eigent 35b4420](https://github.com/eigent-ai/eigent/commit/35b4420ac5b14ec97529e56b2cab9eceaf8a2226) 为此把 runtime 对象拿掉）。

`userAgentData` 整段 `defineProperty` 覆盖后，JS 侧 brands 必须和 HTTP `sec-ch-ua` **逐项一致**（含 GREASE）。现在 HTTP 头和 JS 都是我们手搓的同一套过时 GREASE，和引擎原生 CH 仍可能双头并存。

### 3. 资格 RPC / BotGuard，不是 UA 字符串

AI Studio 后端是 `alkalimakersuite-pa.clients6.google.com`，和 `gemini.google.com` 不是一套。资格检查失败时前端没有专用错误页，直接 `location` 到 available-regions（论坛 179490：「Unable to check your Google AI Subscription」一闪而过）。

可能被读的信号（需 Network 日志才能定性）：

- reCAPTCHA Enterprise / BotGuard token 缺失或校验失败
- Client Hints 与 JS brands 不一致
- 自动化痕迹：CDP、`navigator.webdriver`、Electron 特有对象
- WebAuthn 能力被我们整段关掉（旧补丁为了对齐 Chrome 不弹 USB 框；新门禁可能改读这条）
- partition / 嵌入式 WebContents（无真实顶层 Chrome 窗口 chrome）

### 4. 不要再走已经否决的路

旧文已否决、本次仍然禁止：完整 Chrome UA 字符串替换、preload 改 `navigator.userAgent`、CDP `Network.setUserAgentOverride`、深度伪造 Canvas/WebGL。目标仍是 **剥 Electron 标记 + 与引擎原生 CH 一致**，不是做成超级 stealth 浏览器。

---

## 日后修复方向（先取证，再改）

1. **CH 注入改为「保留 GREASE + 插入 Google Chrome」**，大小写去重，Full-Version-List 仅在原请求已有时回写。
2. **主世界 brands 从原生 `navigator.userAgentData` 读 GREASE**，不要写死 `Not_A Brand` / `24`。
3. **收敛 `window.chrome`**：只补 Chrome 有而 Electron 空的字段；不要发明 `runtime.connect`。
4. 用 CDP 确认资格失败发生在哪条请求（文档导航 vs MakerSuite RPC vs BotGuard）。
5. 若 CH/主世界对齐后仍失败：评估 popup 真窗口、或社区 External Login（仍可能过不了 BotGuard RPC）。
6. 最后手段才是「用真 Chrome 做后端」（Agentify 路线）；那是产品形态变更，不是补丁。

---

## Agent 用 CDP / Playwright 完全接管 debug

目标：下次动手时，agent 自己挂上正在跑的 ChatAIO，列出全部 `WebContents`，锁定 AI Studio 那一层，抓重定向链 / 请求头 / JS 指纹，再挂系统 Chrome 做 diff。人只负责：启动应用、需要时完成 Google 登录。

### 为什么必须走 CDP，而不是 Playwright `_electron.launch`

ChatAIO 的 AI 页是 **`WebContentsView`**，主壳才是 `BrowserWindow`。

| 接法 | 适用 | ChatAIO 坑 |
| --- | --- | --- |
| `_electron.launch` + `firstWindow()` | 测主壳 / 本地 UI | 拿到的是 Main View，**不是** AI Studio。Playwright 对 `BrowserView` 至今几乎不暴露为 Page（[#39507](https://github.com/microsoft/playwright/issues/39507)）；`WebContentsView` 直到 1.60 才有测试（[#39427](https://github.com/microsoft/playwright/issues/39427) / PR 39912），attach 已运行实例仍不稳 |
| `chromium.connectOverCDP('http://127.0.0.1:9222')` | 挂已运行的 Electron | **首选**。官方也说 Electron 壳若不是标准 BrowserWindow，用 CDP（[#38572](https://github.com/microsoft/playwright/issues/38572)） |
| `playwright-cli attach --cdp=http://localhost:9222` | agent CLI：snapshot / click / screenshot | 官方写明支持 **Electron apps exposing CDP**（[Attach](https://playwright.dev/agent-cli/commands/attach)） |
| Cursor `cursor-ide-browser` MCP | Cursor 自己的标签页 | **禁止当成本任务工具** |
| `_electron.launch` 打正式包 | 基本不合适 | asar / 入口不是 Playwright 假设的 `main.js`（[#34815](https://github.com/microsoft/playwright/issues/34815)） |

每个 AI 页是独立 `persist:chataio-ai-<id>` partition。`connectOverCDP` 在 Playwright 里经常只看到 **一个** `BrowserContext`，但 `Target.getTargets` / `GET /json/list` 仍有全部 target。选页请用 **URL**，不要用 `contexts()[0].pages()[0]`。

### 启动（人做一次）

Dev 默认 **不开** renderer CDP（旧身份文档的硬约束），但 **main inspector 已经开着**。接管 renderer 时再显式打开 9222：

```powershell
# 仓库根；先 webpack 再 electron，按现有开发习惯
$env:CHATAIO_REMOTE_DEBUG = '1'
yarn start:webpack
# 另一个终端
$env:CHATAIO_REMOTE_DEBUG = '1'
yarn start:electron
# 实际 spawn：electron . --inspect=9229 --experimental-network-inspection
```

确认两条口（先探活，再挂工具）：

```powershell
# main（Node inspector，start:electron 默认就有）
curl.exe -s http://127.0.0.1:9229/json/list
# renderer（Chromium CDP，仅 CHATAIO_REMOTE_DEBUG=1）
curl.exe -s http://127.0.0.1:9222/json/version
curl.exe -s http://127.0.0.1:9222/json/list
```

`/json/list` 是 Electron 多 WebContents 的事实源（主壳、Settings、Prompt、Floating、每个 AI 页、worker、DevTools）。过滤：

- 要：`aistudio.google.com`、`ai.google.dev/gemini-api/docs/available-regions`、`alkalimakersuite`、`accounts.google.com`
- 不要：webpack localhost 主壳、`chrome-devtools://`、worker、空白 preload park

生产包若要挂 CDP：启动参数加 `--remote-debugging-port=9222`（且不要让发布构建误开；见 `fixme.md` P2-11）。

### Agent 操作顺序

1. **探活**：`/json/version`、`/json/list`，记下 AI Studio target 的 `id` / `url` / `webSocketDebuggerUrl`。
2. **挂上**：`playwright-cli attach --cdp=http://localhost:9222`，或脚本里 `chromium.connectOverCDP`。
3. **选页**：按 URL 切到 AI Studio / 地区页；切错就回到主壳。
4. **先被动再主动**（降低二次污染）：
   - `Network.enable` + 记 `requestWillBeSent` / `responseReceived` / `requestWillBeSentExtraInfo`（真实 `sec-ch-ua*`）
   - 重定向：`aistudio.google.com` → `ai.google.dev/.../available-regions`
   - 资格相关 RPC：`alkalimakersuite-pa.clients6.google.com`、`GenerateContent`、recaptcha / `botguard` / `reload?k=`
5. **再读 JS 指纹**（`Runtime.evaluate`，`returnByValue`）：

```js
({
	href: location.href,
	ua: navigator.userAgent,
	webdriver: navigator.webdriver,
	brands: navigator.userAgentData && navigator.userAgentData.brands,
	highEntropy: null, // 另 await navigator.userAgentData.getHighEntropyValues(['brands','fullVersionList','platform','platformVersion','uaFullVersion'])
	chromeKeys: window.chrome ? Object.keys(window.chrome) : null,
	runtimeType: window.chrome ? typeof window.chrome.runtime : null,
})
```

6. **Chrome 对照**（同一账号已登录）：`playwright-cli attach --cdp=chrome`（需在 Chrome 打开 `chrome://inspect/#remote-debugging`），或另起 `chrome.exe --remote-debugging-port=9333` 专用 profile。对 **同一组字段** 做 diff。Chrome 136+ 对默认 User Data 目录会忽略 `--remote-debugging-port`，对照必须用独立 `--user-data-dir`。
7. **只把 diff 写回本文「取证记录」**；不要在取证过程中改 `browser-identity` / preload。

### Playwright 挂载示例（脚本，未进仓库）

```js
const { chromium } = require('playwright');

(async () => {
	const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
	const pages = browser.contexts().flatMap((c) => c.pages());
	const studio = pages.find((p) => {
		const u = p.url();
		return u.includes('aistudio.google.com') || u.includes('available-regions');
	});
	if (!studio) {
		throw new Error('no AI Studio WebContentsView; check /json/list');
	}
	const cdp = await studio.context().newCDPSession(studio);
	await cdp.send('Network.enable');
	cdp.on('Network.requestWillBeSent', (e) => {
		if (/aistudio|available-regions|makersuite|accounts\.google/.test(e.request.url)) {
			console.log(e.type, e.request.method, e.request.url);
		}
	});
	console.log(await studio.evaluate(() => location.href));
})();
```

`page.url()` 若一直是主壳：用 `Target.getTargets` 按 URL 找到 `targetId`，再 `Target.attachToTarget`。不要假设 Playwright 的 `pages()[0]` 就是 AI 页。

### 建议装的工具（日后，不是现在）

优先顺序：

1. **Playwright + `connectOverCDP`**（已是业界挂 Electron 的默认workaround）
2. **`playwright-cli attach --cdp=`**（agent 交互：snapshot / screenshot / console）
3. 可选 MCP：[electron-test-mcp](https://github.com/lazy-dinosaur/electron-test-mcp)（`connect({ port: 9222 })`）、[electron-agent-tools](https://github.com/svvysh/electron-agent-tools)（world-aware eval：preload / main world / isolated）
4. 不要把 Cursor 内置 browser MCP 配成「ChatAIO 调试器」

若反复做这类门禁，再考虑仓库内加一个 **只在 `CHATAIO_REMOTE_DEBUG=1` 时存在的** 小脚本：`/json/list` → 按 host 过滤 → 把 `webSocketDebuggerUrl` 打出来给 agent。现在不要写。

---

## Agent 接入 main thread（不只是 renderer）

Electron 官方写得很清楚：[窗口内 DevTools 只能调该窗口的 JS](https://electronjs.org/docs/latest/tutorial/debugging-main-process)；main 必须另开 **V8 inspector**（`--inspect` / `--inspect-brk`）。协议和 Chromium CDP 同族（都能 `Runtime.evaluate`），但 **监听端口、target 列表、能碰到的对象完全不同**。

```text
                    ┌─ :9229  Node inspector ── main / 部分 utility
ChatAIO 进程 ──────┤
                    └─ :9222  Chromium CDP ──── 每个 WebContentsView、worker、DevTools
```

| | Main `:9229` | Renderer `:9222` |
| --- | --- | --- |
| 开关 | `scripts/electron.start/index.ts` 固定 `--inspect=9229` | `electron.conf.ts` 仅 `CHATAIO_REMOTE_DEBUG=1` |
| 探活 | `GET http://127.0.0.1:9229/json/list` | `GET http://127.0.0.1:9222/json/list` |
| 能碰到 | `app`、`session`、`BrowserWindow`、`WebContentsView`、reaxel、proxy、identity 补丁 | 页内 JS、DOM、页内 Network、BotGuard |
| Playwright `connectOverCDP` | **不能**（那不是 browser endpoint） | 能 |
| `playwright._electron.launch` | 能（它自己再加 `--inspect=0`） | 能（它自己再加 `--remote-debugging-port=0`） |
| 对本题的用处 | 读实际 UA / partition / 是否装了 CH handler、列出全部 view URL | 抓跳 available-regions 的那一跳和指纹 |

Preload（`ai-page-preload.ts`）两头都沾：文件在 main 侧加载，代码跑在 renderer 的 **isolated world**。查 `executeInMainWorld` 是否生效，要用 9222 上该 AI 页的 **main world** `Runtime.evaluate`，不是 9229。

### 挂已运行实例的 main（ChatAIO Dev 现状）

`yarn start:electron` 已经把 inspector 打在 9229，agent **不必**再让用户加 `--inspect`。流程：

1. `curl http://127.0.0.1:9229/json/list` → 取 `webSocketDebuggerUrl`（形如 `ws://127.0.0.1:9229/<uuid>`）。
2. 用 [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface) 或裸 WebSocket 连上，走 Node inspector 的 `Runtime.evaluate`（`returnByValue: true`）。
3. 表达式跑在 **打包后的 main bundle**（webpack `dist/main.js`）里，不是源码路径。优先调 `require('electron')` 的公开 API，不要假设 `require('#main/...')` 还能解析。

示例（未进仓库）：

```js
const CDP = require('chrome-remote-interface');

(async () => {
	const client = await CDP({ host: '127.0.0.1', port: 9229 });
	const { Runtime } = client;
	await Runtime.enable();
	const { result } = await Runtime.evaluate({
		expression: `(() => {
			const { app, webContents } = require('electron');
			return {
				name: app.getName(),
				chrome: process.versions.chrome,
				views: webContents.getAllWebContents().map((wc) => ({
					id: wc.id,
					url: wc.getURL(),
					ua: wc.getUserAgent(),
				})),
			};
		})()`,
		awaitPromise: true,
		returnByValue: true,
	});
	console.log(JSON.stringify(result.value, null, 2));
	await client.close();
})();
```

对本题，main 侧优先读：

- 每个 `webContents` 的 URL / UA（是否还带 `Electron/`）
- `session.fromPartition('persist:chataio-ai-…').getUserAgent()`
- 是否已 `webRequest.onBeforeSendHeaders`（identity handler 是否挂上）
- 当前前台 AI id（若能从已导出的 reaxel 读到；读不到就不要硬挖 webpack 闭包）

Chrome `chrome://inspect` → 配 `localhost:9229` 是人用的；agent 用 JSON+WebSocket。VS Code `attach` + `"port": 9229` 同样只给人，不适合当 agent 主路径。

**不要**对 9229 做 `chromium.connectOverCDP`：那是 Chromium browser 端点，Node inspector 的 `/json/list` 没有 page target，Playwright 会连空或乱连。

### Playwright / WDIO / MCP 怎么碰 main

| 工具 | 怎样进 main | 成熟度 | ChatAIO 适用 |
| --- | --- | --- | --- |
| `playwright._electron.launch` + `electronApp.evaluate(({ app }) => …)` | 启动时同时接 `--inspect=0` 和 `--remote-debugging-port=0`，main eval 是一等能力 | **官方仍标 experimental**；Electron 30+ 曾把 CLI `--remote-debugging-port=0` 当非法参数（[#39008](https://github.com/microsoft/playwright/issues/39008)，修了又回退过） | 适合 CI 拉起一份干净 Dev 应用；**不适合**挂用户已经打开的 ChatAIO。`firstWindow()` 仍是主壳 |
| `chromium.connectOverCDP(:9222)` | 只 renderer | 稳定（当 Chromium 用） | AI Studio 页内取证的首选 |
| [WebdriverIO `@wdio/electron-service`](https://electronjs.org/docs/latest/tutorial/automated-testing) `browser.electron.execute` | 默认靠 **应用内 IPC bridge**（要改 main/preload）；正在调研改走 Node CDP | Electron 官方 E2E 教程现在 **WDIO 写在 Playwright 前面**；对打包应用更常见 | 要改 ChatAIO 源码才能 execute；当前不要为调试去加 bridge |
| [electron-test-mcp](https://github.com/lazy-dinosaur/electron-test-mcp) `evaluateMain` | **仅 launch mode**；CDP connect 模式明确没有 main | 小项目可用 | 挂已运行实例 = 没有 main |
| [electron-stagewright](https://github.com/electron-stagewright/electron-stagewright) `electron_launch` / `electron_attach` / `electron_inject` | attach=CDP renderer；inject=对已运行进程做 Node inspector handshake；eval 要 `--allow-eval=main` | **方向最对齐 agent**，但还早：0.5.x、star 个位数。Playwright MCP 官方拒绝做 Electron（[playwright-mcp#1291](https://github.com/microsoft/playwright-mcp/pull/1291)）才有的这个分叉 | 可列为日后 MCP 候选，现在不要当依赖 |
| 对已运行进程 `SIGUSR1` / `inspector.open()` | 没带 `--inspect` 时补开 9229 | Unix 可用；**Windows 注入不可靠**（stagewright 自己也写了）。生产若关掉 fuse `EnableNodeCliInspectArguments`，`--inspect` 和 SIGUSR1 **一起失效** | ChatAIO Dev 已带 `--inspect`，不必注入。正式包另说 |

Playwright 要同时拿到 main+renderer，**必须是它自己 launch 的那份进程**。用户日常 `yarn start:electron` 已经占着 9229：agent 应 **attach 9229 +（可选）9222**，而不是再 `_electron.launch` 起第二份 ChatAIO。

### 全自动监控 / 调试 / 运行：能到哪一步

没有单一成熟产品能对 ChatAIO 做「全自动监控+调试+运行」。能拼起来的是 **两条口 + 脚本 + 人处理登录**。

| 能力 | 现在 | 说明 |
| --- | --- | --- |
| **监控 renderer** | 高 | 9222：`Network.enable`、console、导航、截图。白屏监控已是应用内只观察通道，和 CDP 互补 |
| **监控 main** | 中 | 9229：`Runtime.consoleAPICalled`、`Debugger.paused`；stdout 已 `stdio: inherit`。没有现成的「main 结构化 trace」给 LLM |
| **调试 renderer** | 中高 | eval / 读指纹成熟；断点对 agent 不友好，用日志+evaluate |
| **调试 main** | 中（Dev 已具备口） | eval 成熟；webpack 包导致「按源文件设断点」差。agent 应以 **一次性 evaluate 探针** 为主，不要走 VS Code 断点工作流 |
| **驱动本地壳**（切 AI、开 Settings、菜单） | 中 | 可 9222 点主壳，或 9229 调 `webContents` API。主壳是本地 React，比 Google 页好自动化 |
| **驱动 AI 远程页** | 低～中 | Google 页 snapshot 可用，但 BotGuard 会把 CDP 当信号；登录/验证码需要人 |
| **闭环：改补丁 → 重启 → 再取证** | 低 | 重启、选 AI、等登录都要编排；正式包 / asar / fuse 会砍断 inspector。这是日后工程，不是现成能力 |
| **生产包** | 低 | Playwright 官方假定 Dev；asar 入口、`nodeCliInspect` fuse、Chrome 136+ 默认 profile 禁 CDP，都会挡 |

**结论（写给下次动手的 agent）：**

1. **Dev 挂已运行 ChatAIO = 务实上限**：9229 探 main，9222 探 AI Studio 页。两边的 `/json/list` 都要打。
2. **不要指望「一个 MCP 接管整个 Electron」**。Playwright MCP 不做 Electron；stagewright / electron-test-mcp 要么太新、要么 CDP 模式没有 main。
3. **「全自动运行」止于本地壳 + 已登录会话上的只读取证**。Google 登录、地区门、BotGuard 不能当回归套件的绿灯条件。
4. 若以后要接近闭环：优先写 **仓库内双端口探针脚本**（9229 eval + 9222 Network），而不是先接第三方 Electron MCP。

### Main 取证清单（复制即用）

- [ ] `9229/json/list` 能通（`yarn start:electron` 应已监听）
- [ ] `webContents.getAllWebContents()` 的 id / url / ua
- [ ] AI partition 的 session UA 是否仍含 `Electron/`
- [ ] identity 的 `onBeforeSendHeaders` 是否已安装（有则列出实际写出的 `Sec-CH-UA` 需到 **9222 Network extraInfo**，main 里只能确认 handler 在不在）
- [ ] 不要对 9229 用 Playwright `connectOverCDP`
- [ ] 正式包 / 关 fuse 时不要假设 9229 还在

### Agent 取证清单（复制即用）

环境：

- [ ] 无 CDP 时是否已复现（用户 2026-08-27：是）
- [ ] 系统 Chrome 是否正常（用户：是）
- [ ] 本次 CDP 是否打开（`CHATAIO_REMOTE_DEBUG=1`）
- [ ] 生产包还是 `yarn start:electron`
- [ ] 是否刚 Reset 过该 AI Page partition

CDP 产物：

- [ ] `/json/list` 全文（可打码 cookie）
- [ ] AI Studio target 的最终 `location.href`
- [ ] 跳到 available-regions 的 redirect 链（status + Location）
- [ ] 该导航请求的 `User-Agent`、全部 `sec-ch-ua*`（注意是否大小写双头）
- [ ] JS：`userAgent` / `userAgentData.brands` / `getHighEntropyValues` / `window.chrome` keys / `typeof chrome.runtime`
- [ ] MakerSuite / recaptcha / botguard 请求是否 403 / 空 token
- [ ] 同一组字段的 Chrome 对照
- [ ] **main `:9229`**：`webContents.getAllWebContents()` 的 url / ua（见下方 main 清单）

---

## 禁止项

- 当前分支不要改 `browser-identity`、`ai-page-preload.ts`、`electron.conf.ts` 来「试补丁」。
- 不要把 Cursor IDE browser 当 ChatAIO。
- 不要用 `_electron.firstWindow()` 当 AI 页句柄。
- 不要对 `:9229` 调用 `chromium.connectOverCDP`；那是 main 的 Node inspector。
- 不要为了 WDIO `electron.execute` 去给 ChatAIO 加 IPC bridge（那是测试框架侵入，不是 debug 口）。
- 不要在开着 CDP 时声称「补丁已验证可用于生产」。
- 不要用完整 Chrome UA 重写当下一补丁。
- 不要把官方 available-regions 文案当成「用户真的在不支持地区」——除非 Chrome 同样被跳。

---

## 代码地图

```
electron-reaxes-react/
├── scripts/electron.start/index.ts               # spawn：--inspect=9229（main 默认开）
└── projects/ChatAIO/
    ├── src/Main/foundation/electron.conf.ts      # CHATAIO_REMOTE_DEBUG → 9222
    ├── src/Main/services/browser-identity/index.ts
    ├── src/ai-page-preload.ts
    └── docs/issues/google-ai-studio-available-regions-redirect.md
```

---

## 相关链接

- 官方拒绝页：[Available regions](https://ai.google.dev/gemini-api/docs/available-regions)
- 旧补丁：[google-ai-studio-electron-browser-identity.md](./google-ai-studio-electron-browser-identity.md)
- CH 注入教训：[tandem-browser PR 180](https://github.com/hydro13/tandem-browser/pull/180)
- Playwright 挂 Electron：[connectOverCDP](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)、[`_electron.launch` / `evaluate`](https://playwright.dev/docs/api/class-electron)、[playwright-cli attach](https://playwright.dev/agent-cli/commands/attach)
- Electron 官方：[调试 main](https://electronjs.org/docs/latest/tutorial/debugging-main-process)、[Automated Testing](https://electronjs.org/docs/latest/tutorial/automated-testing)（WDIO 在前，Playwright 标 experimental）
- Node inspector 客户端：[chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface)（`port: 9229`）
- Agent 向 MCP：[electron-stagewright](https://github.com/electron-stagewright/electron-stagewright)（新、不成熟）；Playwright MCP [不做 Electron](https://github.com/microsoft/playwright-mcp/pull/1291)
- WebContentsView：[Playwright #39427](https://github.com/microsoft/playwright/issues/39427)、[#38572](https://github.com/microsoft/playwright/issues/38572)
- BotGuard：[aistudio-api](https://github.com/chrysoljq/aistudio-api/blob/master/README_EN.md)

---

## 取证记录

（日后 agent 把 `/json/list` 摘要、redirect 链、CH 头 diff 贴这里。）

| 日期 | 环境 | CDP | 结果 |
| --- | --- | --- | --- |
| 2026-08-27 | 用户本机 ChatAIO vs 系统浏览器 | 日常使用（未要求开 CDP） | ChatAIO → available-regions；浏览器正常 |

---

## 变更历史

| 日期 | 说明 |
| --- | --- |
| 2026-08-27 | 初稿。记录补丁失效与 Chrome 对照；agent CDP/Playwright 接管方案。不改运行时代码。 |
| 2026-08-27 | 补 main thread：9229 Node inspector vs 9222 Chromium CDP；Dev 已开 `--inspect=9229`；全自动监控/调试/运行成熟度。 |
