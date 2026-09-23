# Wipe and Reload 后 Google AI Studio 仍自动登录

## 结论

不是多个 AI 页共用一个 partition，也不是 `google.com` 跨页泄漏。每个 AI 页仍是独立的 `persist:chataio-ai-<id>`（磁盘上各有一份 `Partitions/chataio-ai-<id>/Network/Cookies`）。

旧实现按**当前 HTTP origin**清 storage。用户在 `https://aistudio.google.com` 上点 Wipe 时，只清了 AI Studio 自己的 origin；Google 账号 SSO 落在 `accounts.google.com` 和 `.google.com`（`SID` / `HSID` / `__Host-GAPS` 等）。Reload 后站点带着这些 cookie 走 OAuth，看起来像「没退出」。

ChatGPT「Continue with Google」、Gemini Web 在**各自那一页的 partition**里是同一类问题：Wipe 那一页时要清那一页里的 Google SSO，不是去动别的 AI 页。

**修法**：Wipe（以及 Reset All 的单 partition 清理）清**当前 AI 页的整个 persist partition**，不传 `origin` / `origins`。然后 `loadURL` 配置里的 AI URL，不要 `reloadIgnoringCache`（否则可能停在 `accounts.google.com` 中间页）。

### 为什么不会把 ChatGPT 的 Google 登录一起清掉

系统浏览器里 Gmail / AI Studio / 用 Google 登录的 ChatGPT 共用一个 profile，清 `.google.com` 会串。ChatAIO 不是这样：OAuth 被留在当前 WebContents（`shouldOpenGoogleAuthInCurrentView`），cookie 只进当前页 partition。

Wipe AI Studio ≠ 清 ChatGPT partition 里那份 Google cookie。ChatGPT 的「Continue with Google」副本在 `persist:chataio-ai-<chatgpt页id>`。

### 做不到「只清 AI Studio、留下同页的 Google 父域 cookie」

AI Studio 没有独立账号，登录就是 Google SSO。只清 `aistudio.google.com`、保留 `.google.com` 的 `SID`/`HSID`，就是原 bug。没有稳定的「AI Studio 专用 cookie」可单独删掉并真正退出。

## 不要做

- 不要只按当前 origin 调 `clearStorageData({ origin })` / `clearData({ origins })`。Electron 对非 cookie 存储按精确 origin 匹配；OAuth 期间 `accounts.google.com` 是顶层 first-party，其 IndexedDB / Service Worker 不会被 `aistudio.google.com` origin 清掉。
- 不要为 Google 单独维护一份「相关域名」白名单（`youtube.com` / `gstatic.com` / `googleapis.com` 会漏，ChatGPT / Copilot SSO 也会漏）。
- 不要把这理解成「关掉分区隔离」或「跨 AI 页共享 Google cookie」。其它 AI 页的 partition 不动。
- 不要在内存 catalog-fetch partition 上 `await clearCache`（那是另一条永不 settle 的坑，见 [ai-catalog-manual-update.md](../features/ai-catalog-manual-update.md)）。

## 路径

Windows 自定义菜单和 macOS 原生 View 菜单都曾内联同一段 origin 过滤逻辑。现已收口：

| 入口 | 文件 |
|------|------|
| Win：View → Wipe and Reload | `src/Main/reaxels/Views/Main-View/index.ts` → `wipeAndReloadCurrentAIView` |
| macOS：原生 View 菜单同一项 | `src/Main/reaxels/Menu/index.ts` → 同一函数 |
| 实际清盘 | `src/Main/reaxels/Views/AI-Views/index.ts` 的 `clearPersistentAISession`（Wipe 与 Reset All 共用） |

## 验证

自动：`e2e/tests/wipe-reload-partition.spec.ts`。种 cookie 到两个已打开 AI partition，点 View → Wipe and Reload（E2E 对确认框自动 Yes），断言父域 SSO cookie 被清、另一页仍在。不调用 `wipeAndReloadCurrentAIView`，不打开 Google / ChatGPT 远程页。

本机人工（可选，需真实账号）：

1. 打开 Google AI Studio，登录到能进控制台。
2. View → Wipe and Reload This Page → Yes。
3. 应回到未登录 / 账号选择，而不是直接进已登录工作室。
4. 另开一页 ChatGPT（另一 partition），用 Google 登录后不要动它；只 Wipe AI Studio，ChatGPT 应仍登录。
5. 在 ChatGPT 页上 Wipe：应退出 ChatGPT（含这一页里的 Google SSO）；AI Studio 那一页应仍登录。

## 相关

- [Google AI Studio / Chrome 身份](./google-ai-studio-electron-browser-identity.md)（登录门禁；OAuth 必须留在同 partition）
- [升级后登录全丢](./ai-login-session-lost-after-catalog-uuid.md)（`loadURL` 把未登录 Cookie 写进同一分区；相反方向）
- Electron `session.clearData`：带 `origins` 时 cookie 虽按 eTLD+1 清，但 IndexedDB / SW 仍按 origin；且 CHIPS / 第三方分区下 origin 过滤会漏 iframe 存储（[electron#45531](https://github.com/electron/electron/issues/45531)）
