# Google AI Studio 在 Electron 壳中的登录与生成失败

## 文档目的

记录 ChatAIO 在嵌入式 Electron `WebContentsView` 中加载 `https://aistudio.google.com` 时遇到的登录/生成失败问题，包括症状、根因分析、已验证方案、无效尝试与未来扩展方向。

**验证结论**：生产环境 build 下登录与 Chat 生成已通过；开发模式（`remote-debugging-port=9222`）仍可能失败。

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

在同一 ChatAIO/Electron 壳内：


| 场景                                         | 结果   |
| ------------------------------------------ | ---- |
| ChatGPT / Grok / Gemini 使用 Google OAuth 登录 | 通常正常 |
| Google AI Studio 登录 / 生成                   | 失败   |


这说明 **不是 Google 账号体系对 Electron 的全域封禁**，而是 AI Studio 路径上有额外检测，且 ChatAIO 早期对 AI Studio 的处理策略不当。

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

这说明 Google 正在用浏览器安全认证能力校验环境。Electron 嵌入式浏览器在该流程中更容易被判定不可信。该弹窗 **与问题相关**，但单独禁用 WebAuthn 不能解决根因；需配合正确的 UA/session 策略。

### 4. 开发模式 vs 生产模式

`electron.conf.ts` 在 dev 模式下启用：

```ts
app.commandLine.appendSwitch('remote-debugging-port', '9222');
```

远程调试端口与 CDP 痕迹可能被 BotGuard / 自动化检测视为风险信号。**生产 build 无此开关**，实测通过。

### 5. Popup 处理（待观察项）

当前 `setWindowOpenHandler` 对 Google 域内跳转尽量保留在当前 view，对外链 `openExternal`。部分社区案例表明 Google passkey/OAuth 需要 **真实 popup 子窗口** 才能完成 credential relay（[Comfy-Org/desktop #1662](https://github.com/Comfy-Org/desktop/pull/1662)）。生产环境已通过，暂不改动；若未来回归失败可优先排查此项。

---

## 已实施方案（生产验证通过）

### 模块：`src/Main/services/browser-identity/index.ts`


| 能力                                               | 说明                                                      |
| ------------------------------------------------ | ------------------------------------------------------- |
| `applyGlobalBrowserIdentityFallback()`           | 启动时清理 `app.userAgentFallback` 中的 `Electron/`、`ChatAIO/` |
| `applyBrowserIdentityToView()`                   | 对每个 AI view 的 session + webContents 设置清理后的 UA           |
| `webRequest.onBeforeSendHeaders`                 | 统一覆盖 session 全部请求的 `User-Agent` 与 `Accept-Language`     |
| `shouldOpenGoogleAuthInCurrentView()`            | Google 域内 OAuth 跳转保留在当前 view，避免 session 断裂              |
| `resolveBrowserIdentityMode('google-ai-studio')` | 标记 AI Studio 页面，供环境同步与未来扩展                              |


**刻意不做**：

- 完整 Chrome UA 字符串替换
- 手工伪造 `Sec-CH-UA` / `Sec-CH-UA-Platform`
- Preload 覆盖 `navigator.userAgent`

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
```

### 诊断请求头（Network → accounts.google.com）

- `User-Agent` 应 **不含** `Electron/`
- `Sec-CH-UA` 应与 Chromium 版本自然一致，**不应**与 UA 字符串版本明显冲突

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


| 日期         | 说明                 |
| ---------- | ------------------ |
| 2026-07-11 | 初始文档；生产环境登录与生成验证通过 |


