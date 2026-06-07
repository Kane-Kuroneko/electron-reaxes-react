# AI-WebApp FIXME

本文基于对 `projects/AI-WebApp` 源码、文档、构建配置、`.qoder` / `.codex` agent 规则的阅读整理。每个条目尽量保持内聚，目标是可以独立修复、独立验证。

优先级说明：

- P0：会阻断基础验证、构建质量门或后续排查的基础问题。
- P1：会导致功能行为错误、安全边界不足或用户数据处理不完整的问题。
- P2：会显著增加维护成本、引入隐性行为偏差或导致未来功能扩展不稳定的问题。
- P3：主要是体验、结构收敛、规范一致性或工程卫生问题。

## P1-01 AI 页面语言和主题更新无法完整作用到已存在 WebContents

### 问题现状

AI 页面创建时，`projects/AI-WebApp/src/Main/reaxels/Views/utils/initWebContentsView.ts` 会通过 `webPreferences.additionalArguments` 把语言和主题传给 `projects/AI-WebApp/src/ai-page-preload.ts`。

设置变更后，`projects/AI-WebApp/src/Main/reaxels/Views/AI-Views/index.ts` 的 `updateRuntimeAIView` 会更新 session header、proxy、appearance key，并在变化时 reload。但 `additionalArguments` 是 WebContents 创建时参数，reload 不会重新生成这些 preload 参数。

### 为什么有问题以及后果

业务上，AI-WebApp 希望统一控制 AI 页面的语言、主题和 Accept-Language，让不同 AI 服务在一个宿主中尽量保持一致体验。当前实现只能保证部分 session/header 更新，不能保证已创建 AI 页面的 preload 环境也更新。

可能后果：

- 用户在 Settings 中切换语言后，已打开 AI 页面的 `navigator.language` 仍是旧值。
- 用户在 Settings 中切换主题后，已打开 AI 页面的 preload 注入主题状态可能仍是旧值。
- 表面上菜单和 SettingsView 已更新，但 AI 页面实际环境不同步，形成难以排查的状态不一致。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Main/reaxels/Views/AI-Views/index.ts`
- `projects/AI-WebApp/src/Main/reaxels/Views/utils/initWebContentsView.ts`
- `projects/AI-WebApp/src/ai-page-preload.ts`
- 可能涉及 `projects/AI-WebApp/src/Main/services/appearance/index.ts`

修复步骤：

1. 明确 AI 页面外观/语言更新策略：不要用 `additionalArguments` 承载会变化的语言、主题和 background color，也不要通过 `executeJavaScript` 从 main 进程直接打补丁到远程页面上下文。
2. 新增 AI page environment 数据结构，统一描述 preload 需要的动态环境：
   - `language` / `languages`
   - `theme` / `themeSource`
   - `backgroundColor`
   - `acceptLanguages`
3. `ai-page-preload.ts` 启动时通过 typed sync IPC 获取初始 AI page environment。这里使用同步 IPC 的原因是 preload 的异步 Promise 不会阻塞远程页面首批脚本，`navigator.language` 等环境值必须在页面脚本执行前尽量就位。
4. `ai-page-preload.ts` 通过 typed main-to-renderer IPC 监听 `ai-page-environment-change`，只在 preload 内部更新：
   - `Navigator.prototype.language`
   - `Navigator.prototype.languages`
   - `document.documentElement.dataset.aiWebappTheme`
   - `document.documentElement.dataset.aiWebappThemeSource`
   - `document.documentElement.style.colorScheme`
   - loading/background style
5. main 进程继续负责 session 级状态：
   - `Accept-Language` request header
   - session user agent acceptLanguages
   - view background color
   - proxy
6. 修改 `updateRuntimeAIView`：appearance key 变化时不再重建 WebContentsView，也不依赖 reload 让 `additionalArguments` 重新生效；而是更新 session/view 状态后向对应 AI WebContents 发送最新 environment。
7. 当 `appearance.theme === 'system'` 时，监听系统主题变化并同步已存在 AI view，避免只覆盖 Settings apply 路径。
8. 增加日志或返回结果字段，明确哪些 AI view 收到了环境更新。

验证方式：

- 打开一个 AI 页面后切换 Settings 语言，确认该 AI 页面的 `navigator.language`、请求 Accept-Language、页面 dataset 同步更新。
- 切换 light/dark/system 后，已打开和后台预加载的 AI 页面状态一致。
- 切换设置后菜单、托盘、SettingsView、AI 页面环境不出现互相矛盾。

## P1-02 外链处理不完整且缺少协议白名单

### 问题现状

`projects/AI-WebApp/src/Main/reaxels/Views/utils/initWebContentsView.ts` 只在 `setWindowOpenHandler` 中处理新窗口打开：

- 同源 URL 在当前 AI view 内加载。
- 非同源 URL 调用 `shell.openExternal(url)`。

当前没有看到对主 frame 普通跳转的 `will-navigate` / `will-redirect` 统一处理，也没有对 `shell.openExternal` 的 URL 协议做白名单限制。

### 为什么有问题以及后果

AI 页面是远程网页，AI-WebApp 作为 Electron 宿主需要明确区分“AI 服务内部导航”和“外部链接”。业务目标是让用户在 AI 服务内正常使用，同时防止外部网站、下载页、登录跳转或非预期协议污染 AI WebContents。

可能后果：

- AI 页面内使用 `_self` 方式跳转到外部站点时，会留在 AI WebContents 内，而不是外部浏览器。
- 非 `http` / `https` 协议可能被传给系统 `shell.openExternal`，带来不必要的安全风险。
- 同一 AI view 的 session、proxy、存储隔离被外部站点复用，影响后续登录态和清理逻辑。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Main/reaxels/Views/utils/initWebContentsView.ts`
- 可能新增工具文件：`projects/AI-WebApp/src/Main/reaxels/Views/utils/navigation-policy.ts`

修复步骤：

1. 抽出导航策略函数，输入 current URL、target URL、AI domain，输出 `allow-in-view` / `open-external` / `deny`。
2. 对 `setWindowOpenHandler` 使用同一策略。
3. 监听 `webContents.on('will-navigate')`，只允许同源或被业务明确允许的 AI 服务内部 URL 留在 view 内。
4. 对 `will-redirect` 或 `did-navigate` 做最小处理，避免登录服务必要跳转被误拦；需要针对 ChatGPT、Gemini、Claude 等服务实际登录域名决定白名单策略。
5. `shell.openExternal` 前限制协议为 `http:` 或 `https:`。
6. 对被拒绝的 URL 输出结构化日志，避免静默失败。

验证方式：

- AI 服务内部同源导航仍在当前 AI view 内完成。
- 非同源普通链接、新窗口链接都进入外部浏览器。
- `javascript:`、`file:`、自定义协议不会被 `shell.openExternal` 直接执行。
- 登录流程中必要跨域跳转不被误伤；无法一次覆盖所有服务时，应先记录白名单和已验证服务。

## P1-03 重置 AI 页面时只清理已创建 view 的 session partition

### 问题现状

`projects/AI-WebApp/src/Main/reaxels/Views/AI-Views/index.ts` 的 `destroyAllAndClearData` 从当前 `store.AIViews` 收集 partitions，再逐个 `clearStorageData`、`clearCache`、`clearAuthCache`。

Settings 的 `reset-ais-to-defaults` RPC 位于 `projects/AI-WebApp/src/Main/reaxels/Settings/index.ts`，调用该方法后再 reset AI 配置。

### 为什么有问题以及后果

业务上，“Reset All AI Pages” 文案表示会清除所有 AI 页面配置，用户通常会理解为相关页面数据也会被完整清理。但当前实现只清理运行期已创建的 AI view。未打开、未预加载的 AI 页面虽然也可能有历史 partition，但不会出现在 `store.AIViews` 中。

可能后果：

- 用户以为重置后登录态、cookie、本地存储都清空，实际某些 AI 页面残留数据。
- 后续同 id 默认 AI 再次创建时复用旧 partition，出现“重置后仍保持登录”的反直觉行为。
- 清理行为依赖本次运行时加载过哪些页面，导致不可预测。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Main/reaxels/Views/AI-Views/index.ts`
- `projects/AI-WebApp/src/Main/reaxels/Settings/index.ts`
- 可能涉及 `projects/AI-WebApp/src/Main/services/settings/ai-config-service.ts`

修复步骤：

1. 新增按 AI id 计算 partition 的公开函数，例如 `getAIPartition(aiId)` 或 `getAIPartitionsForAIs(ais)`。
2. reset 前读取当前 effective AIs、默认 AIs、用户删除/自定义 AIs，整理出所有可能存在 session 的 AI ids。
3. 清理时不要只依赖 `store.AIViews`，而是按 AI ids 生成全部 partitions。
4. 对当前存在的 view 先关闭，再清理对应 partition。
5. 清理失败时返回明确错误，不要只 console.warn 后继续假装成功。
6. 文案上明确 reset 是否清理页面 session。如果业务上只想重置配置，不清理登录态，则 UI 文案和函数命名都要调整。

验证方式：

- 打开某 AI 登录后关闭 app，再执行 reset，重新打开该 AI 页面确认 cookie/localStorage 已清除。
- 对未在当前运行期创建 view 但历史存在 partition 的 AI，也能清理。
- reset RPC 返回结果能区分配置 reset 成功和 session 清理失败。

## P1-04 crash reporter 存在 header 拼接 bug 且日志路径不稳定

### 问题现状

`projects/AI-WebApp/src/Main/reaxels/Views/AI-Views/crash-reporter.ts` 中初始化日志 header 的语句形态为：

- `const header = ...; + ...`

分号已经结束赋值，后续字符串前的一元 `+` 不会拼接到 header。结果是初始化日志文件只写入第一段 header。

同文件还使用 `process.cwd()` 拼接 `logs` 目录。

### 为什么有问题以及后果

AI-WebApp 承载多个远程 AI 页面，WebContents crash 是需要长期记录和定位的运行时问题。crash reporter 如果日志内容不完整或路径不稳定，会降低线上排查能力。

可能后果：

- crash 日志缺少预期的说明、环境信息或格式。
- 打包后 `process.cwd()` 可能不是用户数据目录，日志可能写到不可预期位置。
- 如果写入路径无权限或不存在，crash 记录可能失败。
- 文件顶部 import 也不符合仓库“import 放底部”的规则。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Main/reaxels/Views/AI-Views/crash-reporter.ts`
- 可能涉及 `projects/AI-WebApp/logs/webview-crashes.md`

修复步骤：

1. 修正 header 字符串拼接，确保所有说明内容都进入 `header`。
2. 日志路径改为 `app.getPath('userData')` 下的 `logs/webview-crashes.md`，或统一接入 `electron-log`。
3. 写文件前确保目录存在，并对 `writeFileSync` / `appendFileSync` 增加 try/catch。
4. 按仓库规则把 import 移到底部。
5. 如果保留 repo 内 `logs/webview-crashes.md`，只作为文档说明，不作为运行时日志目标。

验证方式：

- 删除用户数据目录下 crash 日志后启动 app，确认生成完整 header。
- 模拟或触发 renderer crash 后，确认日志包含 viewName、URL、reason、exitCode、timestamp。
- 打包环境和开发环境日志都写到确定位置。

## P1-05 Settings patch IPC 缺少运行时 schema 校验

### 问题现状

`projects/AI-WebApp/src/Main/reaxels/Settings/index.ts` 的 `submit-settings` RPC 接收 path 和 data，然后直接调用 `applyPatchByPath` 修改当前 settings。

TypeScript 类型里有 `PatchPath<Settings>` 和 `PatchData<...>`，但运行时没有路径白名单、schema 校验或权限区分。

### 为什么有问题以及后果

Electron 的安全模型要求 renderer 通过 preload 暴露的 API 与 main 通信。虽然 SettingsView 是本地可信页面，但 IPC 边界仍应明确限制可写字段，尤其是设置涉及 proxy、AI URL、系统托盘、GPU、启动模式等运行时行为。

可能后果：

- preload API 一旦被错误复用或页面边界被扩大，main 进程会接受过宽的 patch。
- 错误 path 可能创建意料之外的对象结构，持久化到 `user-settings.json`。
- 代理配置或 AI URL 的格式错误会在更晚的运行期暴露。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Main/reaxels/Settings/index.ts`
- `projects/AI-WebApp/src/Types/SettingsTypes/SettingsPatchPath.d.ts`
- 可能新增：`projects/AI-WebApp/src/Main/services/settings/settings-schema.ts`

修复步骤：

1. 明确允许局部 patch 的字段白名单。当前已知即时持久化需求主要是 `/networks/proxy_test_urls`。
2. 对 `submit-settings` 增加 path 白名单，不允许任意路径。
3. 对每个允许 path 增加运行时数据校验，例如 proxy test URL 必须是对象，且 foreign/domestic 是字符串 URL。
4. 对复杂设置仍通过 `apply-settings` 全量提交，并走现有 normalize 流程。
5. 返回错误时包含 path 和校验失败原因，但不要暴露敏感数据。

验证方式：

- `/networks/proxy_test_urls` 正常保存。
- 非白名单 path 返回失败，不修改 `user-settings.json`。
- 错误数据类型返回失败。

## P1-06 代理认证处理存在全局 login handler 并发风险

### 问题现状

`projects/AI-WebApp/src/Main/services/settings/proxy-service.ts` 的代理测试会临时注册 `app.on('login')`，用于处理 proxy auth。AI view 运行时也会给 `view.webContents` 安装 login handler。

### 为什么有问题以及后果

代理认证是全局网络层事件。测试代理时注册全局 `app.on('login')`，如果用户同时在 AI 页面触发登录或另一个代理测试并发执行，可能出现 handler 互相影响。

可能后果：

- 代理测试认证信息被错误应用到非测试请求。
- 多个并发测试互相覆盖或重复响应。
- 真实 AI 页面认证弹窗或代理认证行为异常。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Main/services/settings/proxy-service.ts`
- `projects/AI-WebApp/src/Types/SettingsTypes/NetworkProxy.d.ts`

修复步骤：

1. 优先使用 session/webRequest 层能限定测试 session 的认证处理方式；如果 Electron API 只能全局监听，应在 handler 内严格筛选请求来源和 `authInfo.isProxy`。
2. 给每次代理测试创建唯一 test id，handler 只处理当前 test session 相关请求。
3. 串行化代理测试，或显式禁止同一时间多个代理测试并发。
4. finally 中确保移除 handler，即使 fetch 超时或异常。
5. 将测试结果中可能包含认证信息的内容脱敏。

验证方式：

- 同时打开 AI 页面和代理测试时，AI 页面认证不受测试影响。
- 连续快速点击多个代理测试不会产生交叉结果。
- 测试失败后再次测试仍能正常注册和清理 handler。

## P2-01 默认 AI 配置存在多处数据源

### 问题现状

默认 AI family 和 URL 分散在多个文件：

- `projects/AI-WebApp/src/shared/statics/default-ais.json`
- `projects/AI-WebApp/src/shared/statics/AI-family.ts`
- `projects/AI-WebApp/src/Main/services/settings/ai-config-service.ts`
- `projects/AI-WebApp/src/Main/reaxels/Views/AI-Views/data.ts`
- `projects/AI-WebApp/src/Views/SettingsView/components/ManageAIs/index.tsx`

其中 `AI-Views/data.ts` 仍保留旧的 AIData 结构；SettingsView 内部也有 `defaultURLByFamily`。

### 为什么有问题以及后果

AI-WebApp 的核心业务是管理多个 AI 服务页面。默认 AI 是菜单、首次引导、设置页、session partition、proxy bypass、preload 策略的共同基础。多处数据源会让新增、删除或修改 AI 服务时产生不一致。

可能后果：

- 新增默认 AI 时忘记同步某个文件，SettingsView 能选但 main normalize 不认识，或 main 认识但 UI 默认 URL 错误。
- 默认 URL 更新后，已有用户配置 merge 行为不明确。
- family 列表、默认 AI 列表、旧 AIData 之间语义混淆。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/shared/statics/default-ais.json`
- `projects/AI-WebApp/src/shared/statics/AI-family.ts`
- `projects/AI-WebApp/src/Main/services/settings/ai-config-service.ts`
- `projects/AI-WebApp/src/Main/reaxels/Views/AI-Views/data.ts`
- `projects/AI-WebApp/src/Views/SettingsView/components/ManageAIs/index.tsx`

修复步骤：

1. 以 `default-ais.json` 作为默认 AI 实例的唯一来源。
2. 从 `default-ais.json` 派生 family 列表和 family 默认 URL，或新增一个 shared utility 统一读取。
3. 删除或废弃 `AI-Views/data.ts` 中的旧默认 URL 数据；如果只需要 domain lookup，改为从 effective AIs 或 default utility 获取。
4. `ManageAIs/index.tsx` 删除本地 `defaultURLByFamily`，改为调用 shared utility。
5. `ai-config-service.ts` 的 normalize 也使用同一 utility，不再保留重复 URL map。
6. 在 docs 中记录默认 AI 数据源规则。

验证方式：

- 修改某个默认 AI URL 只需要改一处数据源。
- SettingsView、首次引导、main normalize、AI view 创建拿到同一默认 URL。
- 新增 family 后，不需要在 4 到 5 个文件中重复手工同步。

## P2-02 AI 配置持久化策略与文档描述不一致

### 问题现状

`projects/AI-WebApp/docs/architecture/ai-config.md` 描述用户配置只存修改和删除项，默认配置从 `default-ais.json` 合并。

实际 `projects/AI-WebApp/src/Main/services/settings/ai-config-service.ts` 中 `replaceAllAIs` 会把完整 effective AIs 写入用户配置，并计算 deletedIds。

### 为什么有问题以及后果

业务上默认 AI 可能随版本更新，例如新增服务、更新服务 URL、调整默认标签。文档描述的 delta merge 模型有利于应用升级时自动接收新默认项。当前完整列表持久化会让默认配置和用户配置边界变模糊。

可能后果：

- 文档误导后续实现者，导致修复或新增功能基于错误模型。
- 新默认 AI 的合并行为不容易预测。
- 用户只改一个字段，却持久化整组 AI，后续默认项升级需要更复杂的兼容逻辑。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/docs/architecture/ai-config.md`
- `projects/AI-WebApp/src/Main/services/settings/ai-config-service.ts`
- `projects/AI-WebApp/src/Types/SettingsTypes/AI.d.ts`
- `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/index.ts`

修复步骤：

1. 先决定业务模型：保留当前完整列表模型，或实现文档中的 delta 模型。
2. 如果保留完整列表模型：
   - 更新 `ai-config.md`，明确用户文件保存完整有效列表。
   - 说明新默认 AI 如何追加、删除项如何记录、默认 URL 如何升级。
3. 如果改为 delta 模型：
   - 定义 user config schema：modifiedById、customAIs、order、deletedIds。
   - `getEffectiveAIs` 根据 default + delta 合成。
   - `replaceAllAIs` 拆分用户修改、排序和删除。
   - SettingsView 保存时仍提交完整 UI 列表，但 service 层转换为 delta。
4. 加测试覆盖默认新增、用户删除、用户改名、用户改 URL、自定义 AI、排序这些场景。

验证方式：

- 文档和 `user-ais.json` 实际结构一致。
- 修改默认 AI 数据后，用户配置按预期合并或覆盖。
- 自定义 AI 和 deleted default AI 在重启后保持一致。

## P2-03 preload AI 配置仍以 family 为粒度，可能丢失实例身份

### 问题现状

`projects/AI-WebApp/src/Main/services/settings/ai-config-service.ts` 的 `getPreloadAIFamilies()` 返回去重后的 `AI.AIFamily[]`。

项目 runtime 规则要求 AI 页面身份使用 `AIItem.id`，family 只是服务类型。

### 为什么有问题以及后果

AI-WebApp 支持多个同 family 的 AI 页面实例，例如两个 ChatGPT 页面使用不同 URL、不同 proxy 或不同登录账号。预加载策略如果只返回 family，会把这些实例折叠成一个类型。

可能后果：

- 同 family 多实例时，无法精确预加载某个页面。
- 后续按页面实例配置 preloadOnStartup 时，设置结果不准确。
- 菜单和 session 使用 id，但 preload 配置使用 family，系统内部语义不一致。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Main/services/settings/ai-config-service.ts`
- `projects/AI-WebApp/src/Types/IpcSchema.d.ts`
- `projects/AI-WebApp/src/preload.ts`
- `projects/AI-WebApp/src/Views/SettingsView/services/Settings/index.ts`
- `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/index.ts`
- `projects/AI-WebApp/src/Main/reaxels/Views/index.ts`

修复步骤：

1. 将 `getPreloadAIFamilies` 改为 `getPreloadAIIds` 或 `getPreloadAIs`。
2. IPC schema 返回 `string[]` 或 `AI.AIItem[]`，优先返回 id 列表。
3. SettingsView 和 main runtime 中所有预加载判断改用 `AIItem.id`。
4. 保留旧 API 时只作为兼容层，不再用于新逻辑。
5. 文档同步更新，明确 family 与 id 的职责。

验证方式：

- 创建两个同 family AI，其中只勾选一个 preload，启动后只预加载该 id 对应页面。
- 菜单顺序、currentAIViewKey、partition、preload 使用同一 id。

## P2-04 SettingsView 存在无条件启用的 Dev rehancer

### 问题现状

`projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/index.ts` 无条件执行 `rehancer_Dev`。

`projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/rehancer_Dev/index.ts` 会把 SettingsView 默认菜单设置为 `net`。

### 为什么有问题以及后果

SettingsView 的默认入口是用户日常设置页。无条件 dev rehancer 会让生产环境也默认进入网络页，行为和文件命名不一致。

可能后果：

- 首次打开 Settings 时不进入 General，用户看到的不是语言、主题、系统等基础项。
- 后续新增 dev-only 行为时容易误带到生产环境。
- 测试和真实用户行为不一致，难以定位默认页问题。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/index.ts`
- `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/rehancer_Dev/index.ts`

修复步骤：

1. 在调用处增加 `if (__DEV__)` 保护，或删除该 rehancer。
2. 如果需要开发时默认打开网络页，把该行为做成显式 dev setting 或 URL/hash 参数。
3. 确认生产构建中不会执行 `rehancer_Dev`。

验证方式：

- 开发环境按预期可进入调试默认页。
- 生产构建打开 SettingsView 默认进入 General。
- 搜索 `rehancer_Dev` 确认没有其他无条件副作用。

## P2-05 SettingsView 菜单、面板和状态结构未收敛

### 问题现状

SettingsView 当前菜单只有：

- General
- Networks
- Manage AIs

但目录中仍存在独立的：

- `projects/AI-WebApp/src/Views/SettingsView/components/Appearance/index.tsx`
- `projects/AI-WebApp/src/Views/SettingsView/components/System/index.tsx`

其中 `System/index.tsx` 仍引用旧字段 `store.tray`，而当前系统设置字段是 `show_tray`、`close_to_tray`。

### 为什么有问题以及后果

这说明 SettingsView 曾经有 Appearance/System 独立面板，后来合并到 General，但旧模块没有删除或更新。遗留模块会误导后续开发者，也可能在再次接入菜单时直接引入错误字段。

可能后果：

- 后续重构菜单时误用旧组件，导致系统托盘设置失效。
- 状态结构中 `appearance`、`system` 与组件划分不一致，维护者需要反复确认真实入口。
- 死代码增加类型检查和搜索噪声。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Views/SettingsView/App.tsx`
- `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/index.ts`
- `projects/AI-WebApp/src/Views/SettingsView/components/General/index.tsx`
- `projects/AI-WebApp/src/Views/SettingsView/components/Appearance/index.tsx`
- `projects/AI-WebApp/src/Views/SettingsView/components/System/index.tsx`

修复步骤：

1. 决定 SettingsView 信息架构：
   - 继续 General 承载 Language / Appearance / System。
   - 或拆成 Appearance、System 独立菜单。
2. 如果继续合并：
   - 删除或归档 Appearance/System 旧组件。
   - 确保 `Menus` 类型只保留实际菜单。
3. 如果拆分：
   - 在 `RootMenu.menus` 加入 appearance/system。
   - 修正 App 的 `MenuContentComponent`。
   - 更新 `System/index.tsx` 使用 `show_tray` / `close_to_tray`。
4. 同步 i18n keys 和 docs。

验证方式：

- SettingsView 菜单项与实际组件一一对应。
- 所有菜单项打开后能正确读写 settings。
- 搜索不到旧字段 `store.tray`。

## P2-06 SettingsView reaxel 过厚，业务动作和 UI 状态耦合过多

### 问题现状

`projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/index.ts` 同时承担：

- settings 加载与 apply。
- dirty snapshot。
- AI modal 状态和 AI name 生成。
- proxy test URL 即时持久化队列。
- theme 与 i18n 即时预览。
- 构造提交到 main 的完整 settings。

### 为什么有问题以及后果

SettingsView 是 AI-WebApp 复杂度最高的本地 UI。所有业务动作集中在一个 reaxel，会让每次修改都容易影响无关区域。

可能后果：

- 修改 proxy 逻辑时影响 AI modal dirty 判断。
- 修改 i18n/theme 预览时影响 apply snapshot。
- 难以给单一业务动作写测试或做局部复用。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/index.ts`
- 可能新增：
  - `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/settings-dirty.ts`
  - `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/ai-editor.ts`
  - `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/proxy-editor.ts`
  - `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/appearance-preview.ts`

修复步骤：

1. 先不改行为，只拆纯函数：
   - `buildSettingsFromStore`
   - `buildDirtySettingsSnapshot`
   - `buildDefaultAIName`
   - AI modal field normalize
2. 再拆局部 action：
   - AI editor actions。
   - Proxy editor actions。
   - Appearance preview actions。
3. 保留 `reaxel_SettingsView` 作为组合入口，避免大规模组件改动。
4. 每次拆分后运行 SettingsView tsc 和手动打开设置页验证。

验证方式：

- 拆分后 dirty 判断、apply、reload、AI 增删改、proxy test URL 保存行为不变。
- `settings-view/index.ts` 文件职责缩小，新增模块可单独阅读和测试。

## P2-07 i18n 资源重复且缺少键级类型校验

### 问题现状

SettingsView 和 GuidingView 各自维护一套 i18n reaxel 和语言资源：

- `projects/AI-WebApp/src/Views/SettingsView/reaxels/i18n`
- `projects/AI-WebApp/src/Views/GuidingView/reaxels/i18n`

SettingsView 的语言文件使用 `as any`，GuidingView 使用 `Record<string, string>`。组件里仍有部分硬编码英文未走 i18n，例如 ManageAIs 的 `Save` / `Cancel` URL suffix、删除确认文案、LongPressConfirmButton 的 `Confirm`。

### 为什么有问题以及后果

AI-WebApp 已经支持多语言，且 main menu、tray、SettingsView、GuidingView 都需要语言一致。资源分散和无键级校验会增加漏翻译概率。

可能后果：

- 同一个英文 key 在 SettingsView 和 GuidingView 翻译不一致。
- 新增 UI 文案后没有任何类型或构建检查提示漏翻译。
- 用户切换语言后，部分按钮仍显示英文。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Views/SettingsView/reaxels/i18n/index.ts`
- `projects/AI-WebApp/src/Views/SettingsView/reaxels/i18n/langs/*.ts`
- `projects/AI-WebApp/src/Views/GuidingView/reaxels/i18n/index.ts`
- `projects/AI-WebApp/src/Views/GuidingView/reaxels/i18n/langs/*.ts`
- `projects/AI-WebApp/src/Views/SettingsView/components/ManageAIs/index.tsx`
- `projects/AI-WebApp/src/Views/GuidingView/components/*.tsx`
- `projects/AI-WebApp/docs/architecture/i18n.md`

修复步骤：

1. 抽出共享语言定义和基础 key 类型。
2. 对 source language keys 建立 `const` key 集合，让其他语言资源必须满足同一 key 集合。
3. SettingsView 和 GuidingView 可继续分模块，但共享基础语言、显示名、fallback 逻辑。
4. 全项目搜索硬编码 UI 文案，替换为 `I18n` 或 `i18n`。
5. 删除 `as any`，至少用 `satisfies Record<SourceKey, string>`。
6. 更新 i18n docs，明确新增文案的流程。

验证方式：

- 切换 zh-CN、zh-TW、ja-JP、ko-KR 后 SettingsView 和 GuidingView 不出现明显英文漏翻。
- 新增 source key 后，其他语言资源缺 key 时 tsc 能报错。

## P2-08 首次引导进度保存和恢复语义不完整

### 问题现状

GuidingView 会调用 `guiding-save-progress` 保存部分进度，main 侧在 `projects/AI-WebApp/src/Main/reaxels/Views/Guiding-View/index.ts` 处理 progress。

但 renderer 初始化时 `get-guiding-defaults` 返回的是默认配置和环境，未看到把之前保存的 partial progress 合并回 UI 的流程。

### 为什么有问题以及后果

首次引导是用户第一次建立 AI-WebApp 运行配置的关键流程。如果用户中途关闭窗口或 app，已选择的语言、网络状态、自定义 AI 是否恢复需要明确。

可能后果：

- 用户以为“下一步”已保存，但重新进入引导时 UI 又回到默认值。
- main 已保存 partial settings，但 renderer UI 没反映，造成数据源不一致。
- 网络检测结果、AI 勾选、自定义 AI 可能丢失。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Main/reaxels/Views/Guiding-View/index.ts`
- `projects/AI-WebApp/src/Views/GuidingView/reaxels/guiding-view/index.ts`
- `projects/AI-WebApp/src/Types/Guiding.d.ts`
- `projects/AI-WebApp/src/Views/GuidingView/components/*.tsx`

修复步骤：

1. 明确 `Guiding.Defaults` 是否应包含已保存 progress。
2. 如果要恢复进度：
   - 在 main 侧读取当前 persisted settings 和 user AI config。
   - `get-guiding-defaults` 返回 `progress` 或 `initialState`。
   - renderer `reloadDefaults` 合并 progress 到 UIControls。
3. 如果不恢复进度：
   - 删除或弱化 `saveProgress` 语义，只在 finish 时保存。
   - UI 文案不要暗示中间步骤已完整保存。
4. 网络检测结果是否持久化需要单独定义，避免每次启动使用过期网络结论。

验证方式：

- 引导第 1 步修改语言后关闭，再打开，行为符合定义。
- 引导第 2 步选择 direct/blocked 后关闭，再打开，行为符合定义。
- 自定义 AI 在中断后恢复或明确不恢复。

## P2-09 代理服务器密码字段在部分 UI 中未使用密码输入

### 问题现状

SettingsView 的 per-AI proxy auth 在 `projects/AI-WebApp/src/Views/SettingsView/components/ManageAIs/index.tsx` 使用 `Input.Password`。

但全局代理服务器编辑弹窗位于 `projects/AI-WebApp/src/Views/SettingsView/components/Network/ProxyServers/index.tsx`，其中 password 字段使用普通 `Input`。

### 为什么有问题以及后果

代理服务器密码属于敏感信息。即使只是本地设置页，也应该避免明文显示在输入框中，除非用户主动切换可见。

可能后果：

- 录屏、投屏或他人旁观时暴露代理密码。
- 同一业务对象在不同 UI 中体验不一致。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Views/SettingsView/components/Network/ProxyServers/index.tsx`
- 可能涉及 `projects/AI-WebApp/src/Views/SettingsView/components/ManageAIs/index.tsx`

修复步骤：

1. 将 ProxyServers 中 proxy auth password 字段改为 `Input.Password`。
2. 检查所有 proxy auth UI，保持 password 输入行为一致。
3. 如果日志或 diagnostic 会输出 proxy config，确保 password 脱敏。
4. 视业务需要决定是否提供“清除认证”按钮。

验证方式：

- 新增/编辑代理服务器时密码默认不可见。
- 保存后再打开，密码字段行为一致。
- 控制台和代理测试结果不输出明文密码。

## P2-10 菜单读取 runtime settings 的方式重复且存在局部异常风险

### 问题现状

`projects/AI-WebApp/src/Main/reaxels/Menu/index.ts` 内部定义了 `getRuntimeSettings`，`projects/AI-WebApp/src/Main/reaxels/Views/index.ts` 也有类似逻辑。菜单重建时从 settings service 读取当前配置。

同文件的 “Wipe and Reload This Page” 会对 `currentAIView.view.webContents.getURL()` 直接 `new URL(...)`，未看到 try/catch。

### 为什么有问题以及后果

Menu 和 Views 都依赖同一份 runtime settings。如果各自读取和组装，后续设置 schema 变化容易出现一边更新、一边遗漏。

`new URL` 对 `about:blank`、空 URL、特殊协议可能抛错。菜单操作是用户可直接触发的功能，不应因当前页面状态异常导致 main 侧未捕获错误。

可能后果：

- 菜单 AI 列表与实际 view 同步策略出现轻微偏差。
- Wipe 当前页在尚未加载或加载失败状态下报错。
- console debug 日志长期留在生产路径中。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Main/reaxels/Menu/index.ts`
- `projects/AI-WebApp/src/Main/reaxels/Views/index.ts`
- 可能新增：`projects/AI-WebApp/src/Main/services/settings/runtime-settings.ts`

修复步骤：

1. 抽出统一的 `getRuntimeSettings` 或 `settingsRuntime.getCurrentSettings()`。
2. Menu 和 Views 都使用同一入口。
3. `Wipe and Reload This Page` 对当前 URL 做 try/catch。
4. 对非 http/https URL 或无 origin 的 URL，给用户提示或只执行 reload，不执行 origin storage clear。
5. 清理或降级 debug console log。

验证方式：

- 设置 AI 启用/禁用/排序后，菜单和 view 切换顺序一致。
- 当前页为 about:blank 或加载失败时，Wipe 菜单项不会让 main 抛异常。

## P2-11 安全配置未显式启用 sandbox，开发调试开关需要发布隔离

### 问题现状

主窗口、SettingsView、GuidingView、Floating-Layer、AI WebContentsView 基本都设置了：

- `nodeIntegration: false`
- `contextIsolation: true`

但没有看到显式 `sandbox: true`。

`projects/AI-WebApp/src/Main/foundation/electron.conf.ts` 在 `__DEV__` 下开启：

- `remote-debugging-port=9222`
- `remote-allow-origins=*`

### 为什么有问题以及后果

AI-WebApp 会加载远程 AI 服务网页。Electron 应用承载远程网页时，应尽量收紧 webPreferences 和调试入口。当前配置已有基本隔离，但仍可进一步加强。

可能后果：

- 远程页面一旦触发浏览器层漏洞，sandbox 缺失会降低隔离强度。
- dev 调试开关如果被错误带入发布构建，会暴露远程调试端口。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Main/mainWindow.ts`
- `projects/AI-WebApp/src/Main/reaxels/Views/utils/initWebContentsView.ts`
- `projects/AI-WebApp/src/Main/reaxels/Views/Guiding-View/index.ts`
- `projects/AI-WebApp/src/Main/reaxels/Views/Floating-Layer/index.ts`
- `projects/AI-WebApp/src/Main/foundation/electron.conf.ts`
- `projects/AI-WebApp/partial.webpack-conf.ts`

修复步骤：

1. 评估 preload 与 sandbox 的兼容性，尤其是 `contextBridge` 和项目 IPC 工具是否正常。
2. 对 AI 页面优先启用 `sandbox: true`。
3. 对本地 SettingsView/GuidingView/Floating-Layer 分别测试，能启用则统一启用。
4. 确认 `__DEV__` 在生产构建中可靠为 false。
5. 对 remote debugging 开关增加二次保护，例如只在显式环境变量开启时设置。

验证方式：

- 启用 sandbox 后 SettingsView、GuidingView、Floating-Layer IPC 仍可用。
- AI 页面能正常加载和登录。
- 生产构建中搜索不到 remote debugging 开关实际执行路径。

## P2-12 类型严格度较低且 any/as any 使用较多

### 问题现状

AI-WebApp 四个 tsconfig 都关闭了多项严格检查：

- `strict: false`
- `strictNullChecks: false`
- `noImplicitAny: false`

源码中存在较多 `any` / `as any`，分布在 IPC、proxy auth、i18n、SettingsView、快捷键等模块。

### 为什么有问题以及后果

AI-WebApp 的业务对象嵌套较深，例如 settings、AI item、proxy config、guiding progress。低严格度会让 null、undefined、错误字段名、错误事件参数更容易进入运行时。

可能后果：

- `store.tray` 这类旧字段不会被及时发现。
- proxy auth、IPC event 参数和 patch data 容易绕过类型约束。
- 后续修复者需要靠运行时验证而不是编译器定位问题。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/tsconfig.json`
- `projects/AI-WebApp/src/Views/SettingsView/tsconfig.json`
- `projects/AI-WebApp/src/Views/GuidingView/tsconfig.json`
- `projects/AI-WebApp/src/Views/Floating-Layer/tsconfig.json`
- 全部出现 `any` / `as any` 的源码文件

修复步骤：

1. 先完成 P0-01，让 tsc 可用。
2. 不要一次开启全部 strict；先开启 `noImplicitAny` 或局部使用 `satisfies` 收紧关键对象。
3. 优先处理 IPC、SettingsTypes、NetworkProxy、AI config、Guiding progress。
4. 对确实需要 any 的 Electron event handler，封装为局部 typed adapter，避免 any 扩散。
5. 最后再评估 `strictNullChecks`。

验证方式：

- 每次收紧一个类型区域后运行对应 tsc。
- 删除旧字段或改错字段名时，编译器能报错。

## P3-01 缺少自动化测试覆盖

### 问题现状

在 `projects/AI-WebApp` 下未发现 `*test*` 或 `*spec*` 测试文件。当前质量验证主要依赖手动阅读和运行构建。

### 为什么有问题以及后果

AI-WebApp 的高风险逻辑很多是纯业务规则，适合测试：

- settings normalize。
- AI default/user merge。
- proxy resolve。
- no_proxy_for 匹配。
- AI view sync 选择逻辑。
- menu adjacent AI 计算。
- appearance language/theme resolve。

没有测试会让后续修复依赖人工手动覆盖所有组合，成本高且遗漏概率大。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/package.json`
- 可能新增 `projects/AI-WebApp/src/**/*.test.ts`
- 可能新增 `projects/AI-WebApp/test` 或 `projects/AI-WebApp/src/test-utils`

修复步骤：

1. 确认 monorepo 已有测试框架；如果没有，优先选择项目已有依赖或轻量引入，不要随意新增大框架。
2. 先为纯函数加测试，不直接测 Electron UI：
   - `shared/appearance`
   - `settings-config-service` normalize。
   - `ai-config-service` merge。
   - `proxy-service` resolve。
   - `menu-label-width`。
3. 再考虑对 AI view sync 抽纯函数，测试 current/preload/destroy 决策。
4. 将测试命令加入 package script 或文档。

验证方式：

- 至少能单独运行 AI-WebApp 相关测试。
- 修改默认 AI、proxy mode、appearance language 时有测试失败提示。

## P3-02 运行时日志和 debug 输出未收敛

### 问题现状

多个模块存在 `console.log`、`console.groupCollapsed`、`crayon.warn` 等调试输出。例如：

- `projects/AI-WebApp/src/Views/SettingsView/components/Network/GlobalNetProxy/index.tsx`
- `projects/AI-WebApp/src/Main/reaxels/Menu/index.ts`
- `projects/AI-WebApp/src/Main/reaxels/Settings/index.ts`
- `projects/AI-WebApp/src/Main/reaxels/I18n/index.ts`

### 为什么有问题以及后果

开发期日志有价值，但生产环境应区分 debug、warn、error，并避免输出敏感配置。proxy 相关日志尤其需要注意不要暴露服务器、认证信息或用户自定义规则。

可能后果：

- 控制台噪声掩盖真实错误。
- proxy 配置、AI label、URL 等信息被不必要打印。
- 日志格式不统一，后续排查效率低。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Views/SettingsView/components/Network/GlobalNetProxy/index.tsx`
- `projects/AI-WebApp/src/Main/reaxels/Menu/index.ts`
- `projects/AI-WebApp/src/Main/reaxels/Settings/index.ts`
- `projects/AI-WebApp/src/Main/reaxels/I18n/index.ts`
- 可能新增 shared logger utility

修复步骤：

1. 区分开发期 debug 输出和生产期日志。
2. 将 renderer debug logs 包在 `__DEV__` 下。
3. main 侧使用 electron-log 或统一 logger。
4. proxy/auth 相关日志做脱敏。
5. 对用户可见错误使用 UI message 或返回 RPC error，不只写 console。

验证方式：

- 生产构建中不输出调试 group。
- proxy password 不会出现在任何日志。
- 真实错误仍能被记录。

## P3-03 长按确认按钮存在重复实现和文案硬编码

### 问题现状

长按按钮至少有三处实现或变体：

- `projects/AI-WebApp/src/Views/SettingsView/App.tsx`
- `projects/AI-WebApp/src/Views/SettingsView/components/ManageAIs/index.tsx`
- `projects/AI-WebApp/src/Views/GuidingView/components/LongPressButton/index.tsx`

ManageAIs 中的环形确认按钮还硬编码了 `Confirm`。

### 为什么有问题以及后果

长按确认用于危险操作，例如 clean start、skip、finish、reset。重复实现会导致危险操作确认时长、触摸处理、loading 禁用、可访问性和 i18n 表现不一致。

可能后果：

- 某些危险操作按住 900ms，另一些需要 2000ms，用户预期不一致。
- 触摸端和鼠标端行为不一致。
- 部分文案无法翻译。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/Views/SettingsView/App.tsx`
- `projects/AI-WebApp/src/Views/SettingsView/components/ManageAIs/index.tsx`
- `projects/AI-WebApp/src/Views/GuidingView/components/LongPressButton/index.tsx`
- 可能新增 `projects/AI-WebApp/src/Views/shared/components/LongPressButton.tsx`

修复步骤：

1. 抽出共享 LongPressButton。
2. 支持 duration、danger、loading、children、progress style。
3. 所有危险操作统一使用该组件。
4. 所有按钮文案走对应 i18n。
5. 删除重复实现。

验证方式：

- Clean Start、Guiding skip/finish、Reset All AI Pages 长按行为一致。
- 切换语言后按钮文案都能翻译。

## P3-04 shared/structs/settings 与 SettingsTypes 存在旧结构重复

### 问题现状

`projects/AI-WebApp/src/shared/structs/settings/index.ts` 仍保留旧的 settings/reaxable 结构和 `Menus` 类型。

当前更权威的设置类型在：

- `projects/AI-WebApp/src/Types/SettingsTypes/index.d.ts`
- `projects/AI-WebApp/src/Types/SettingsTypes/AI.d.ts`
- `projects/AI-WebApp/src/Types/SettingsTypes/NetworkProxy.d.ts`

SettingsView reaxel 内部又定义了一套 UIControls 初始结构。

### 为什么有问题以及后果

设置类型是业务核心。旧结构继续存在会让后续开发者不确定应该引用哪一份，尤其是菜单类型、appearance/system 字段已经发生过变化。

可能后果：

- 新代码误引用旧 `Menus` 或旧字段。
- SettingsTypes 和 UIControls drift 越来越大。
- 类型收紧时旧结构制造额外错误。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/src/shared/structs/settings/index.ts`
- `projects/AI-WebApp/src/Types/SettingsTypes/*.d.ts`
- `projects/AI-WebApp/src/Views/SettingsView/reaxels/settings-view/index.ts`

修复步骤：

1. 搜索 `shared/structs/settings` 的所有引用。
2. 如果只剩 `Menus` 被使用，把 `Menus` 移到 SettingsView 本地类型或 SettingsTypes。
3. 删除旧 settings store 结构，或重命名为 legacy 并加注释说明不再用于 runtime。
4. 让 UIControls 初始值尽量从 SettingsTypes/default utility 派生。

验证方式：

- 删除旧结构后 tsc 不报引用错误。
- SettingsView 菜单类型仍正确。

## P3-05 构建产物和运行日志目录对类型扫描与仓库卫生有影响

### 问题现状

`projects/AI-WebApp` 下存在：

- `dist`
- `__Bin`
- `logs`
- `NVIDIA Corporation`

根 `.gitignore` 忽略了 `dist` 和 `__Bin`，但 TypeScript 由于 `typeRoots` 配置仍会扫描这些目录。`logs/webview-crashes.md` 当前在项目目录内。

### 为什么有问题以及后果

构建产物和运行日志不应影响源码类型检查。当前 P0-01 的直接错误就包括 `dist`、`__Bin` 等目录被当成 type library。

可能后果：

- 构建产物变化导致 tsc 结果变化。
- 运行日志和源码文档边界不清。
- 开发机特有目录进入项目结构，影响其他人复现。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/tsconfig.json`
- 根 `.gitignore`
- `projects/AI-WebApp/logs/webview-crashes.md`
- `projects/AI-WebApp/src/Main/reaxels/Views/AI-Views/crash-reporter.ts`

修复步骤：

1. 先修正 `typeRoots`，避免扫描普通目录。
2. 确认 `dist`、`__Bin`、运行日志都在 ignore 范围内。
3. runtime crash logs 移到 userData。
4. repo 内如果需要保留 `logs/webview-crashes.md`，只作为格式说明，不写运行时内容。
5. 评估 `NVIDIA Corporation` 目录来源，确认是否应加入 ignore 或清理。

验证方式：

- tsc 不受构建产物目录影响。
- 运行 app 后不会在源码目录生成新的运行日志。

## P3-06 文档与 todo 需要同步到真实实现状态

### 问题现状

AI-WebApp docs 已覆盖 AI config、appearance/theme、i18n 和若干 issues，但部分内容与实现存在偏差，例如 AI config 的用户配置模型。

`projects/AI-WebApp/todo.md` 中的外链逻辑、proxy 优先级、tray、i18n、快捷键等事项，有些已部分实现，有些仍未完成。

### 为什么有问题以及后果

AI-WebApp 是多模块 Electron app，后续 agent 或开发者很依赖文档理解架构。如果文档和真实实现不同，会导致错误修复方向。

可能后果：

- 依据文档实现 delta AI config，但源码实际是完整列表模型。
- todo 中已完成事项被重复实现，未完成事项被误认为已完成。
- agent 执行任务前的架构判断偏离真实系统。

### 修复步骤与修改范围

修改范围：

- `projects/AI-WebApp/docs/architecture/ai-config.md`
- `projects/AI-WebApp/docs/architecture/appearance-theme-environment.md`
- `projects/AI-WebApp/docs/architecture/i18n.md`
- `projects/AI-WebApp/docs/issues/*.md`
- `projects/AI-WebApp/todo.md`
- 本文件 `projects/AI-WebApp/fixme.md`

修复步骤：

1. 在完成每个 FIXME 后，更新对应 architecture docs。
2. 将 todo 中已完成、部分完成、未完成状态标清。
3. 对外链、proxy、i18n、AI config 这些跨模块事项补充“真实数据流”。
4. 保持 `fixme.md` 只记录待修复项，修复后移动到 changelog 或删除对应条目。

验证方式：

- 新开发者只读 docs 能推导出与源码一致的数据流。
- todo 中没有明显已完成但仍标未完成的任务。
