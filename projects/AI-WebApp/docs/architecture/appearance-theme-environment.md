# Appearance Theme Environment

## 模块用途

AI-WebApp 的 Appearance 模块负责在主进程和渲染进程之间统一解释主题偏好：

- `appearance.theme` 表示用户选择的主题偏好：`light`、`dark` 或 `system`。
- Electron 主进程通过 `nativeTheme.themeSource` 应用用户偏好，并为 AI 页面 preload 参数、窗口背景、菜单/托盘等运行时行为计算最终主题。
- SettingsView 和 GuidingView 只负责展示和编辑配置；当用户选择 `system` 时，它们需要显示真实系统主题，并把预览主题同步到当前 renderer DOM。

因此 renderer 侧获取系统主题必须走 `get-appearance-environment` IPC，由主进程返回经过平台差异处理后的真实系统主题。

## 为什么不能只用 matchMedia

`window.matchMedia( '(prefers-color-scheme: dark)' ).matches` 运行在 renderer 进程中，它反映的是当前 WebContents 看到的 `prefers-color-scheme`。在 Electron 中，主进程可以通过 `nativeTheme.themeSource` 覆盖应用主题来源。

当 main thread 设置过 `nativeTheme.themeSource` 后，renderer 里的 `matchMedia` 可能读到的是应用主题偏好造成的结果，而不是操作系统当前真实主题。业务上 `Follow System` 说明文字和主题预览需要真实系统值，否则会把“应用强制主题”误判成“系统主题”。

正确分工是：

- renderer 的 `matchMedia` 只可作为变化信号，提示当前页面重新请求环境。
- 真实系统主题由 main thread 的 appearance service 读取并通过 IPC 返回。
- main thread 内部读取时需要继续绕开 `nativeTheme.themeSource` 的覆盖影响，例如 Windows 使用 `shouldUseDarkColorsForSystemIntegratedUI`，macOS 使用 `systemPreferences.getUserDefault( 'AppleInterfaceStyle' , 'string' )`。

## AI 页面环境同步

AI 页面是远程 WebContents，语言和主题属于运行时可变环境，不应长期绑定在 `webPreferences.additionalArguments` 这类创建时参数里。

当前模型：

- main thread 的 appearance service 生成 `AIPageEnvironment`，包含 `language`、`languages`、`theme`、`themeSource`、`backgroundColor` 和 `acceptLanguages`。
- `ai-page-preload.ts` 启动时通过 typed sync IPC 读取初始 `AIPageEnvironment`。这里使用同步 IPC 是为了在远程页面首批脚本执行前尽量完成 `Navigator.prototype.language/languages` 覆盖。
- Settings apply 或 `theme: system` 下的系统主题变化会触发 main thread 同步既有 AI views。
- main thread 继续负责 session 级状态，包括 `Accept-Language` header、session user agent acceptLanguages、view background color 和 proxy。
- preload 只负责页面上下文内的环境投影，包括 `navigator.language`、`navigator.languages`、`documentElement.dataset`、`colorScheme` 和 loading/background style。

禁止路线：

- 不用 `executeJavaScript` 从 main thread 直接向远程页面上下文打补丁。
- 不用重建 WebContentsView 作为语言/主题变更的常规同步手段。
- 不向远程 AI 页面暴露通用 `window.api`。
