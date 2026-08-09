# Google AI Studio 在 Electron 壳中的登录与生成失败

## 文档目的

记录 ChatAIO 在嵌入式 Electron `WebContentsView` 中加载 `https://aistudio.google.com` 时遇到的登录/生成失败问题，包括症状、根因分析、已验证方案、无效尝试与未来扩展方向。

**验证结论**：生产环境 build 下 AI Studio 登录与 Chat 生成曾通过；**2026-08 起** Google 标准 OAuth 门禁加强后，ChatGPT「Continue with Google」在正式包内也会失败，需对全部 AI session 启用 Chrome 品牌补丁（见变更历史 2026-08-10）。开发模式（`remote-debugging-port=9222`）仍可能失败。

---

## 症状

### 登录阶段

- 页面可加载，但 Google 账号登录时出现：
  - `This browser or app may not be secure`
  - 中文：`此浏览器或应用可能不安全`
- 输入邮箱后，Windows 可能弹出 **「Windows 安全中心 / 插入安全密钥」** 的 WebAuthn 提示（即使用户未配置 USB 安全密钥也可能出现）
- 取消或继续后，可能跳转到 `accounts.google.com/v3/signin/rejected`

### 生成阶段（若已登录）

- Chat 时报错：
  - `Failed to generate content: permission denied. Please try again.`
  - `An internal error has occurred.`
- DevTools Network 中可见：
  ```
  POST https://alkalimakersuite-pa.clients6.google.com/.../GenerateContent → 403
  Response: "The caller does not have permission"
  ```

### 对照现象（关键）

在同一 ChatAIO/Electron 壳内（历史对照；**2026-08 起 Google 门禁已扩到标准 OAuth**）：


| 场景                                         | 结果（旧） | 结果（2026-08 后） |
| ------------------------------------------ | ------ | -------------- |
| ChatGPT / Grok / Gemini 使用 Google OAuth 登录 | 通常正常   | 仅剥 UA 时也会 `may not be secure` |
| Google AI Studio 登录 / 生成                   | 失败     | 需 Chrome 品牌补丁 |


因此 **不能再只对 AI Studio 开补丁**；凡可能跳到 `accounts.google.com` 的 AI partition（含 ChatGPT）都要启用同一套 Client Hints + 主世界身份。

---

## 架构背景

### Google 登录 vs AI Studio 控制面


| 层级              | 域名/服务                                     | 用途                            |
| --------------- | ----------------------------------------- | ----------------------------- |
| 标准 Google OAuth | `accounts.google.com`                     | 各站点通用的 Google 账号登录            |
| Gemini Web      | `gemini.google.com`                       | 消费端 Gemini 界面                 |
| AI Studio       | `aistudio.google.com`                     | MakerSuite 开发者控制台             |
| AI Studio RPC   | `alkalimakersuite-pa.clients6.google.com` | 内部 `GenerateContent` 等控制面 RPC |


Gemini 与 AI Studio **不是同一套后端**。AI Studio 文档与论坛案例表明，除 IAM/地区/ToS 外，还有 **Security checks / Trust & Safety / BotGuard** 等额外校验。

参考：

- [Troubleshoot Google AI Studio](https://ai.google.dev/gemini-api/docs/troubleshoot-ai-studio)
- [Google AI Developers Forum - permission denied](https://discuss.ai.google.dev/t/bug-failed-to-generate-content-permission-denied/88510)

### ChatAIO AI 页面模型

- 每个 AI 页面使用独立 persistent partition：`persist:chataio-ai-<sanitized-id>`
- 远程页面通过 `ai-page-preload.js` 注入，覆盖 `navigator.language/languages`、主题等
- 主进程 `browser-identity` 服务负责 session 级 UA 与请求头处理

---

## 根因分析

### 1. Session 级 UA 仍带 `Electron/` 标记

仅对 `webContents.setUserAgent()` 做 per-view 清理 **不够**。子资源请求（XHR、fetch、preflight、service worker）仍可能使用 session 级 UA，其中包含 `Electron/x.x.x`。Google 会在后台请求中检测该标记。

参考：[oculo commit - Fix Google sign-in on fresh installs](https://github.com/xidik12/oculo/commit/b8eb3142a42884868c3aca58f56ce12019eec438)

### 2. 完整 Chrome UA 伪装反而触发「冒用浏览器」检测

早期尝试将 AI Studio 的 UA 替换为完整 Chrome 字符串，并手工注入 `Sec-CH-UA`、在 preload 覆盖 `navigator.userAgent`。

Google 官方明确禁止在嵌入式框架中 **冒用其他浏览器的 User-Agent**（[Google Developers Blog 2020](https://developers.googleblog.com/en/guidance-to-developers-affected-by-our-effort-to-block-less-secure-browsers-and-applications/)）。

当 UA 字符串、`Sec-CH-UA`、`navigator.userAgentData` 不一致时，Google 账号体系会将请求标记为可疑。论坛案例：Firefox UA 切换扩展在 AI Studio 上也会触发 `permission denied`，即使用户声称已排除该域名。

**结论**：对 AI Studio 应使用与 Gemini 相同的 **「仅剥离 Electron/ChatAIO 标识」** 策略，而非深度 Chrome 指纹伪造。

### 3. WebAuthn / 安全密钥弹窗是关联信号，不是独立根因

Windows 上输入邮箱后弹出的「插入安全密钥」来自 Google 登录流程中的 **WebAuthn / Passkey / FIDO2** 探测。

[Agentify Desktop #11](https://github.com/agentify-sh/desktop/issues/11) 报告了完全一致的现象：

1. 先弹 Windows Security (WebAuthn) 提示
2. 随后 Google 显示 `This browser or app may not be secure`

这说明 Google 正在用浏览器安全认证能力校验环境。Electron 嵌入式浏览器在该流程中更容易被判定不可信。

**默认策略（与 Chrome 对齐）**：拦截 `navigator.credentials` 的 `publicKey` 调用，并把 `PublicKeyCredential.isConditionalMediationAvailable` 固定为 `false`。依据 [Electron #47147](https://github.com/electron/electron/issues/47147)：Chrome 对 conditional mediation **不弹系统框**；Electron 会误弹 Windows「插入安全密钥」。拦截后 Google 回退到密码等其它方式。另通过 `Permissions-Policy: publickey-credentials-*=()` 双保险。

### 3b. 2026 中起：仅剥 UA 已不够 — `userAgentData` / `window.chrome`

[linux-mail-wrapper 2026-06 验证](https://github.com/jariahh/linux-mail-wrapper/commit/8d7925a70b0dd03e376747a154f27c09cfd4af80) 表明：Chrome UA + Sec-CH-UA 头改写仍不够时，Google 登录门禁还会读 **页内 JS**：

1. `navigator.userAgentData.brands` 只有 `Chromium` / `Not A(Brand`，**没有 `Google Chrome`**
2. `window.chrome` 在 Electron 里经常是空对象（真 Chrome 有 `app` / `runtime` / `loadTimes` / `csi`）

对策（已落地到 **全部 AI page** 的 `google-chrome-identity` mode；旧名 `google-ai-studio` 仍兼容）：

- Session `onBeforeSendHeaders`：为 AI partition 注入含 `Google Chrome` 的 `Sec-CH-UA*`
- Preload `contextBridge.executeInMainWorld`：在页面主世界补齐 `userAgentData` + `window.chrome`
- Dev 默认关闭 `remote-debugging-port`（需 `CHATAIO_REMOTE_DEBUG=1` 才开）
- `shouldOpenGoogleAuthInCurrentView`：允许从 **任意当前页**（含 `chatgpt.com`）把 `accounts.google.com` 留在同 view，避免 popup 被 `openExternal` 打断 cookie 会话

### 4. 开发模式 vs 生产模式

`electron.conf.ts`：

- 默认：`disable-blink-features=AutomationControlled`
- Dev：仅当 `CHATAIO_REMOTE_DEBUG=1` 时开启 `remote-debugging-port=9222`
- 额外：`enable-features=WebAuthentication,...`（改善 passkey / hybrid 路径）

远程调试端口与 CDP 痕迹可能被 BotGuard / 自动化检测视为风险信号。**勿在开着 CDP 的情况下否定登录方案。**

### 5. Popup 处理（待观察项）

当前 `setWindowOpenHandler` 对 Google 域内跳转尽量保留在当前 view，对外链 `openExternal`。部分社区案例表明 Google passkey/OAuth 需要 **真实 popup 子窗口** 才能完成 credential relay（[Comfy-Org/desktop #1662](https://github.com/Comfy-Org/desktop/pull/1662)）。若 UA/CH/主世界补丁后仍失败可优先排查此项。

---

## 已实施方案（生产验证通过）

### 模块：`src/Main/services/browser-identity/index.ts`


| 能力                                               | 说明                                                      |
| ------------------------------------------------ | ------------------------------------------------------- |
| `applyGlobalBrowserIdentityFallback()`           | 启动时清理 `app.userAgentFallback` 中的 `Electron/`、`ChatAIO/` |
| `applyBrowserIdentityToView()`                   | 对每个 AI view 的 session + webContents 设置清理后的 UA           |
| `webRequest.onBeforeSendHeaders`                 | 统一覆盖 session 全部请求的 `User-Agent` 与 `Accept-Language`     |
| `googleChromeClientHints`（全部 AI）               | 同 handler 注入含 `Google Chrome` 的 `Sec-CH-UA*`            |
| preload `executeInMainWorld`（全部 AI）            | 主世界补齐 `userAgentData` + `window.chrome`                 |
| `shouldOpenGoogleAuthInCurrentView()`            | 任意站点 → Google OAuth 保留在当前 view（同 partition）            |
| `resolveBrowserIdentityMode('google-chrome-identity')` | 所有 AI page 启用上述 CH / 主世界补丁（不再限 AI Studio）        |


**刻意不做**：

- 完整 Chrome UA 字符串替换（与 Client Hints 失配）
- 手工伪造与引擎版本不一致的 `Sec-CH-UA`
- Preload 覆盖 `navigator.userAgent`
- 用 CDP `Network.setUserAgentOverride`（debugger 本身可被检测；社区已弃用该路径）

### 其他改动


| 文件                       | 改动                                                     |
| ------------------------ | ------------------------------------------------------ |
| `before-launch.ts`       | 最早时机调用 `applyGlobalBrowserIdentityFallback()`          |
| `electron.conf.ts`       | 全局 `disable-blink-features=AutomationControlled`       |
| `ai-page-preload.ts`     | 屏蔽 `navigator.webdriver`（轻量，不伪造 Chrome）                |
| `ai-page-environment.ts` | WebContents → AIPageEnvironment 注册，修复 preload 读取时序     |
| `appearance/index.ts`    | Accept-Language 与 UA 请求头合并到 browser-identity 单 handler |


### 策略原则

```
有效策略 = 剥离 Electron 标识 + 保持 Chromium 原生 Client Hints 一致
无效策略 = 深度伪装成 Chrome + UA/Client Hints/navigator 不一致
```

---

## 无效或高风险尝试（勿重复）


| 尝试                                      | 结果                            |
| --------------------------------------- | ----------------------------- |
| 完整 Chrome UA + 手工 Sec-CH-UA             | 登录仍 `not secure`，可能加剧指纹不一致    |
| Preload 覆盖 `navigator.userAgent`        | 与 HTTP 头 / userAgentData 更易失配 |
| 仅 per-webContents UA，不清理 session/global | 子资源请求仍带 Electron 标记           |
| Dev 模式 + remote-debugging 下测试           | 易误判为方案无效                      |


---

## 验证清单

### 生产环境（推荐）

1. `yarn build:webpack` 后启动打包产物（非 dev server + electron dev）
2. Settings → Manage AIs → **Reset** 目标 AI Page（清旧 session）
3. 打开 `https://aistudio.google.com` 自定义页面或新建 AI 项
4. 完成 Google 登录（若出现安全密钥弹窗，可取消后选「使用密码」等备用方式）
5. 发送测试消息（如 `hi`）
6. DevTools → Network：确认 `GenerateContent` 非 403

### 开发环境

- 预期可能仍失败（remote-debugging-port）
- 勿仅凭 dev 结果否定方案

### 诊断命令（Console）

```js
navigator.userAgent
navigator.webdriver
navigator.userAgentData?.brands
window.chrome && Object.keys(window.chrome)
```

AI Studio / ChatGPT Google OAuth 期望：

- `userAgent` **不含** `Electron/`
- `userAgentData.brands` **含** `{ brand: 'Google Chrome', ... }`
- `window.chrome` 含 `app` / `runtime`（非空对象）

### 诊断请求头（Network → accounts.google.com）

- `User-Agent` 应 **不含** `Electron/`
- `Sec-CH-UA` 应含 `"Google Chrome";v="…"`，且 major 与引擎一致
- **不应**开着 `remote-debugging-port` 测（除非 `CHATAIO_REMOTE_DEBUG=1` 且接受干扰）

---

## 若未来再次失败

按优先级排查：

1. **确认测试环境**：是否 production build；dev 下 remote-debugging 会干扰
2. **Reset AI Page partition**：清除带旧 UA/旧 session 的磁盘状态
3. **检查 popup 策略**：OAuth/passkey 是否需要独立 BrowserWindow（同 partition、无 preload）
4. **账号/地区/ToS**：AI Studio 独立的风控与 IAM（与 Gemini 登录成功不矛盾）
5. **外部浏览器登录 + Session 导入**（社区 fallback）：
  - [Google-AI-Studio-Desktop](https://github.com/Augus1217/Google-AI-Studio-Desktop) 的 External Login + Cookie 注入
  - 注意：AI Studio 后续 RPC 还可能需要 BotGuard snapshot，单纯 cookie 可能不足以支撑 API 级调用
6. **Chrome CDP 后端**（重量级）：驱动真实 Chrome 而非 Electron WebContents（[Agentify v0.1.0](https://github.com/agentify-sh/desktop/releases/tag/v0.1.0)）

---

## 代码地图

```
projects/ChatAIO/
├── src/Main/
│   ├── before-launch.ts              # applyGlobalBrowserIdentityFallback()
│   ├── foundation/electron.conf.ts   # AutomationControlled; dev remote-debugging
│   ├── services/browser-identity/    # UA 清理、请求头、Google URL 判定
│   ├── services/appearance/          # Accept-Language → browser-identity
│   └── reaxels/Views/
│       ├── utils/initWebContentsView.ts  # applyBrowserIdentityToView; Google auth 内联
│       └── AI-Views/
│           ├── index.ts              # createRuntimeAIView 时应用 identity
│           └── ai-page-environment.ts
├── src/ai-page-preload.ts            # webdriver 屏蔽
└── docs/issues/
    └── google-ai-studio-electron-browser-identity.md  # 本文档
```

---

## 相关链接

- [Google - Block less secure browsers and applications](https://developers.googleblog.com/en/guidance-to-developers-affected-by-our-effort-to-block-less-secure-browsers-and-applications/)
- [Agentify - Google SSO + WebAuthn on Windows](https://github.com/agentify-sh/desktop/issues/11)
- [electron-gsuite-proton-client - AI Studio UA fix](https://github.com/apenlor/electron-gsuite-proton-client/commit/35e9c861c5241136a591e27cec357c76820f8a3a)
- [aistudio-api - BotGuard snapshot requirement](https://github.com/chrysoljq/aistudio-api/blob/master/README_EN.md)

---

## 变更历史


| 日期         | 说明 |
| ---------- | ---- |
| 2026-07-11 | 初始文档；生产环境登录与生成验证通过（`eb22ec7ad`：仅剥离 Electron/ChatAIO） |
| 2026-08-05 | **回归修复**：merge `d6dadd4f` 误把未验证 `buildChromeLikeUserAgent` 带回；已恢复仅剥离。 |
| 2026-08-05 | **深度修复**：Google 门禁升级后，仅剥 UA 仍报 `may not be secure`。对齐 [linux-mail-wrapper 8d7925a](https://github.com/jariahh/linux-mail-wrapper/commit/8d7925a70b0dd03e376747a154f27c09cfd4af80)：AI Studio 注入 `Sec-CH-UA`（含 Google Chrome 品牌）+ 主世界 `userAgentData`/`window.chrome`；dev 默认关闭 remote-debugging（`CHATAIO_REMOTE_DEBUG=1`）。 |
| 2026-08-05 | **Passkey 弹窗**：默认拦截 WebAuthn `publicKey`（主世界 + Permissions-Policy），避免 Electron 误弹 Windows USB 安全密钥框（[Electron #47147](https://github.com/electron/electron/issues/47147)，Chrome 不会如此）；登录回退密码等方式。 |
| 2026-08-10 | **ChatGPT 正式版回归**：Google 门禁扩到标准 OAuth。正式包内 ChatGPT「Continue with Google」再次 `may not be secure`。修复：全部 AI page 启用 `google-chrome-identity`（Sec-CH-UA + 主世界补丁）；并放行 `chatgpt.com` → `accounts.google.com` 的同 view OAuth popup。 |


