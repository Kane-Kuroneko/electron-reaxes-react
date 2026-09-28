# 快捷键必须是应用内，禁止 `globalShortcut`

## 一句话结论

Ctrl+W / Ctrl+[ / Ctrl+] / Alt+[ / Alt+] / Ctrl+Tab 是 **ChatAIO 有键盘焦点时** 的应用内快捷键，不是系统热键。禁止用 Electron `globalShortcut.register` 绑定它们。

## 症状

ChatAIO 不在前台（焦点在 Chrome、其它应用、桌面）时按 Ctrl+W，当前 AI 页仍被关掉。其它应用的 Ctrl+W 也会被抢走。

## 原因

`src/Main/services/shortcuts/ai-switch.ts` 曾把这些键注册成 `globalShortcut`。Electron 文档写明：全局快捷键在应用 **没有** 键盘焦点时也会触发。

曾用 `mainWindow` 的 `focus` / `blur` / `show` / `restore` / `hide` / `minimize` 去 register / unregister，想把它「假装成应用内」：

- `globalShortcut` 一旦还挂着，OS 就会把按键吃掉，其它应用收不到。
- `blur` 在多窗（FloatingView `parent` + alwaysOnTop、Dropdown `showInactive`）上并不总是代表「用户已经离开 ChatAIO」。
- `show` / `restore` 会在窗口 **未聚焦** 时重新 register。
- 启动时无条件 register，不看焦点。

即使在回调里判断 `isFocused()` 再 no-op，热键仍被系统吃掉，后台 Ctrl+W 会变成「谁都不关」。

Windows 自定义 menubar 走 `setMenu(null)`，没有原生菜单 accelerator；macOS 的 Close This AI 也是 `registerAccelerator: false`，避免和 in-app 处理双击关两页。绑定只能靠 `before-input-event`。

## 现行路径

| 快捷键 | 作用 | 绑定 |
|--------|------|------|
| Ctrl/Cmd+W | 关闭当前 AI 页 | `before-input-event` → `handleAISwitchShortcutInput` |
| Ctrl/Cmd+[ / ] | 上一/下一已打开 AI | 同上 |
| Alt+[ / ] | 上一/下一已启用 AI | 同上 |
| Ctrl/Cmd+Tab（含 Shift） | 上一/下一已打开 AI | 同上 |
| Ctrl/Cmd+R、Shift+R、F12、Ctrl+0/=/-、Alt+,/. | Reload / DevTools / Zoom / Prompt | `window-keyboard.ts` 的 menu shortcut 段 |
| macOS Cmd+Z/X/C/V/A/M | 编辑 / 最小化 | 原生 Application Menu（仅 app 激活时） |
| Settings `hotkeys` | 空对象 | 未使用 |

入口：`installWebContentsKeyboardGuard`（所有 BrowserWindow + `initWebContentsView` 的 WCV）。`handleWindowKeyboardInput` 先 Alt 守卫，再 AI 切换，再菜单快捷键。

菜单项上的 `accelerator` 字符串只用于 **显示**（自定义 menubar / 原生菜单文案）。

## 禁止项

- 用 `globalShortcut` 绑 Ctrl+W、Ctrl+[、Ctrl+Tab 等应用内操作。
- 靠 `blur` unregister / `focus` register 给全局热键「补丁」成应用内。
- 给 Close This AI 打开 `registerAccelerator: true` 同时再处理 `before-input-event`（会关两页）。
- 只在 AI WebContents 上挂一份 `before-input-event`、menubar 壳层不挂（焦点在菜单栏时快捷键会丢）。

## 关键文件

| 文件 | 职责 |
|------|------|
| `src/Main/services/shortcuts/window-keyboard.ts` | 统一 `before-input-event` |
| `src/Main/services/shortcuts/ai-switch.ts` | 解析 AI 切换 / Ctrl+W，调用 handler |
| `src/Main/reaxels/Views/index.ts` | `setAISwitchShortcutHandlers` |
| `src/Main/reaxels/Menu/index.ts` | 菜单显示 accelerator；Close This AI `registerAccelerator: false` |
| `tests/shortcuts-in-app.test.ts` | 解析契约 + 源码不得出现 `globalShortcut` |

## 怎么验

1. ChatAIO 前台、焦点在 AI 页或 menubar：Ctrl+W 关当前 AI 页；Ctrl+[ / ] 切已打开页。
2. 切到其它应用再 Ctrl+W：ChatAIO 的 AI 页不动；其它应用自己的关标签应正常。
3. 不要同时起两棵 wt 的 unpackaged Electron。
