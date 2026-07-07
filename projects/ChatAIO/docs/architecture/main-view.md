# MainView — 架构与产品文档

## 背景

ChatAIO 当前架构中，`mainWindow` 是一个空 `BrowserWindow`（无 HTML 内容），所有可见内容均通过 `WebContentsView` 子视图呈现（AI 页面、Settings、PromptView）。菜单功能仅通过 Electron 原生 `Menu.buildFromTemplate`（`reaxel_Menu`）实现系统菜单栏，缺少一个 Web 原生的导航/菜单 UI。

用户此前尝试做 MenuView 时将其放入了 `WebContentsView` 中，但 MenuView 本应作为 `mainWindow` 的 HTML 直接加载。本次任务是将 MenuView 完全重构为 **MainView**，丢弃旧架构中的 layer/点击事件/拖拽等技术细节，仅迁移业务逻辑（菜单元素和交互），并以新架构重新设计。

## 产品目标

将 MainView 设计为 ChatAIO 的 Web 原生主界面（加载为 mainWindow 的 HTML），作为整个应用的"壳"层，提供：

1. **AI 导航/切换** — 显示已配置的 AI 服务列表，点击切换当前激活的 AI 页面
2. **设置入口** — 打开/关闭 SettingsView
3. **视图控制** — 刷新、缩放、DevTools、PromptView 左右面板开关
4. **关闭/退出** — 关闭当前 AI 页面、退出应用
5. **应用状态指示** — 当前活跃 AI、连接状态等

MainView 作为 mainWindow 的主 HTML 内容渲染，WebContentsView（AI 页面、Settings、PromptView）作为 contentView 子视图层叠在 MainView 内容区域上方。

## 目标架构

```
┌──────────────────────────────────────────────────────────┐
│ mainWindow (BrowserWindow)                                │
│ titleBarStyle: 'hiddenInset' (macOS)                      │
│ webContents 加载 MainView HTML                            │
│                                                           │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ MainView (window HTML)                               │  │
│ │ ┌──────────────────────────────────────────────────┐ │  │
│ │ │ NavBar (拖拽区/标题栏区域, ~36px)                  │ │  │
│ │ │ [AppIcon] ← macOS 红绿灯自动叠加                  │ │  │
│ │ └──────────────────────────────────────────────────┘ │  │
│ │ ┌──────────────────────────────────────────────────┐ │  │
│ │ │ Toolbar (工具区, ~40px)                           │ │  │
│ │ │ [AI1][AI2][AI3]... [⚙ Settings] [Reload] [Zoom] │ │  │
│ │ └──────────────────────────────────────────────────┘ │  │
│ │                                                      │  │
│ │ contentView 子视图区域 (WebContentsView)              │  │
│ │ ┌──────────────────────────────────────────────────┐ │  │
│ │ │                                                   │ │  │
│ │ │  当前活跃内容：AI 页面 / Settings / PromptView     │ │  │
│ │ │  (WebContentsView 层叠在 MainView HTML 上方)       │ │  │
│ │ │                                                   │ │  │
│ │ └──────────────────────────────────────────────────┘ │  │
│ │                                                      │  │
│ │ Footer / StatusBar (~24px)                           │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                           │
│ FloatingView (独立 BrowserWindow, 透明 overlay)            │
│   用于 SwitchAiBar 卡片切换动画                            │
└──────────────────────────────────────────────────────────┘
```

## 技术方案

### 1. 新增 Renderer Entry: MainView

**文件**: `src/Views/MainView/index.tsx`
**入口声明**: 添加至 `src/shared/renderer-entries.ts` 的 `AI_WEBAPP_RENDERER_ENTRY_POINTS`

```
MainView: 'src/Views/MainView/index.tsx'
```

### 2. mainWindow 加载 MainView HTML

修改 `src/Main/mainWindow.ts` / `src/Main/runtime.ts`，使 mainWindow 在创建后加载 MainView：

- **Development**: `mainWindow.webContents.loadURL('https://localhost:4444/MainView/')`
- **Production**: `mainWindow.webContents.loadFile(path.join(absAppRunningPath, 'renderer', 'MainView', 'index.html'))`

mainWindow 的 `webPreferences.preload` 已配置为 `preload.js`，MainView 可直接使用 `window.api` 调用主进程 IPC。

### 3. MainView 组件结构

```
src/Views/MainView/
├── index.tsx                 # 入口，挂载 App
├── App.tsx                   # 主组件，reaxper 包裹
├── index.less                # 样式
├── g.d.ts                    # 全局声明
├── reaxels/
│   ├── main-view/index.ts    # reaxel_MainView — 状态 + 业务逻辑
│   └── i18n/index.ts         # MainView 专用 i18n
├── components/
│   ├── NavBar/index.tsx       # 顶部标题栏（拖拽区）
│   ├── Toolbar/index.tsx      # AI 切换工具栏
│   └── StatusBar/index.tsx    # 底部状态栏
```

### 4. MainView 状态管理 (reaxel_MainView)

`reaxel_MainView` 管理 MainView 的 UI 状态和业务逻辑：

```typescript
reaxel_MainView.store = {
   activeAIViewKey : string,         // 当前活跃的 AI 页面 ID
   settingsViewOpened : boolean,     // Settings 是否打开
   promptViewLeftVisible : boolean,  // 左侧 PromptView 是否可见
   promptViewRightVisible : boolean, // 右侧 PromptView 是否可见
   enabledAIs : AIItem[],            // 启用的 AI 列表
   instantiatedAIViews : string[],   // 已实例化的 AI View ID 列表
}
```

业务方法（从 `reaxel_Menu` 迁移）：
- `switchToAI(aiId)` — 切换到指定 AI 页面
- `toggleSettings()` — 打开/关闭 Settings
- `togglePromptView(side)` — 切换 PromptView
- `reloadCurrentView()` — 刷新当前视图
- `forceReloadCurrentView()` — 强制刷新
- `toggleDevTools()` — 开发者工具
- `zoomIn/zoomOut/zoomReset()` — 缩放控制
- `closeCurrentAI()` — 关闭当前 AI
- `quitApp()` — 退出应用
- `checkForUpdates()` — 检查更新

### 5. IPC 通信

MainView 作为 renderer 进程使用 `window.api` 调用主进程：

```typescript
// 新增 IPC 通道（IpcSchema.d.ts）
'request-main-view-state'   // IpcRpc: void → MainViewState (获取初始状态)
'switch-to-ai'              // IpcRpc: string(aiId) → void
'toggle-settings'           // IpcRpc: void → void
'toggle-prompt-view'        // IpcRpc: PromptViewSide → void
'close-current-ai'          // IpcRpc: void → { success: boolean }
'quit-app'                  // IpcRpc: void → void
'check-for-updates'         // IpcRpc: void → void

// 主进程 → MainView 事件
'main-view-state-changed'   // MainToRenderer: MainViewStateDelta
```

### 6. WebContentsView 布局调整

MainView HTML 包含导航栏/工具栏区域（共约 76px），WebContentsView 的 bounds 需调整：

```typescript
// 从 MainView 发送或主进程计算
const toolbarHeight = 76; // NavBar(36) + Toolbar(40)
const statusBarHeight = 24;

// AI/Settings WebContentsView 的 y 偏移
view.setBounds({
   x: 0,
   y: toolbarHeight,
   width: mainWindow.getContentBounds().width,
   height: mainWindow.getContentBounds().height - toolbarHeight - statusBarHeight,
});
```

**方案选择**：由于 MainView HTML 和 WebContentsView 是不同渲染上下文，WebContentsView 的布局由主进程管理（`Reaxel_View.fitWindow()` 中调整 y 偏移）。MainView HTML 中的工具栏区域（76px 高度）需要与主进程约定的偏移量保持一致。

**建议**：通过 preload/IPC 通信传递 MainView 布局参数。MainView 在渲染后告知主进程其工具栏高度，主进程据此调整 WebContentsView 布局。

### 7. macOS SSL 证书问题

**根因**：dev server 使用的自签名证书由 mkcert 在 Windows 机器上生成（CN: `mkcert KANE-KURONEKO-4\Kuroneko@Kane-Kuroneko-4090`），macOS 上未安装对应的 CA 根证书。

**报错链**：
1. `net::ERR_CERT_AUTHORITY_INVALID (-202)` — Electron 不信任自签名证书
2. `net::ERR_CONNECTION_CLOSED (-100)` — chatgpt.com 连接被关闭（可能是代理配置问题，与证书无关）

**已实施的修复**（方案 A + B 并存）：

**方案 A（已实施）**: 在 macOS 上安装 mkcert 并重新生成证书
```bash
brew install mkcert
mkcert -install                              # 安装本地 CA 到系统信任存储（需 sudo）
cd engine/cert
mkcert -cert-file 127.0.0.1+5.pem -key-file 127.0.0.1+5-key.pem localhost 127.0.0.1 0.0.0.0 ::1
```
使用 `-cert-file` / `-key-file` 标志精确匹配 `engine/webpack/devserver.ts` 期望的文件名。

**方案 B（已实施）**: 在 `electron.conf.ts` 的 `if(dev())` 块中添加：
```typescript
app.commandLine.appendSwitch('ignore-certificate-errors');
```
该开关作为安全网存在：即使证书未完美配置（如 mkcert CA 未加入系统信任存储），dev 模式下的 WebView 仍能正常加载本地 HTTPS 页面。仅 dev 模式启用，生产构建不受影响。

**方案 C**: 使用 Electron `certificate-error` 事件处理（未实施，方案 B 已覆盖其需求）。

方案 A 提供正规的加密证书链，方案 B 确保无论证书配置状态如何开发工作都不受阻。`NODE_TLS_REJECT_UNAUTHORIZED=0`（在 `scripts/electron.start/index.ts` 中设置）处理 Node.js 层 TLS，与 Chromium 层证书验证是两个独立层面，两者都需保留。

### 8. 现有 FloatingView 的处理

`FloatingView`（SwitchAiBar 卡片切换动画）目前是一个独立的透明 `BrowserWindow` 覆盖在主窗口上方。在 MainView 架构中：

- **保留 FloatingView** — SwitchAiBar 卡片动画是透明 overlay，需要独立窗口来穿透鼠标事件
- **可考虑迁移到 MainView** — 将 SwitchAiBar 卡片作为 MainView HTML 内的组件（CSS 动画），但需要处理与 WebContentsView 的层叠关系。由于 WebContentsView 覆盖在 MainView HTML 上方，SwitchAiBar 需使用独立窗口显示在 WebContentsView 之上。

**决策**：保留 FloatingView 独立窗口，因为它需要显示在 WebContentsView 上方。

## 实施任务清单

### Phase 1: 基础架构
1. 新增 `MainView` renderer entry（`renderer-entries.ts` + `partial.webpack-conf.ts`）
2. 创建 `src/Views/MainView/` 目录骨架（index.tsx, App.tsx, index.less, g.d.ts）
3. 创建 `reaxel_MainView`（reaxels/main-view/index.ts）
4. 修改 `mainWindow.ts`/`runtime.ts` 使 mainWindow 加载 MainView HTML
5. 新增 IPC 通道（IpcSchema.d.ts + preload.ts + Main 侧 handler）

### Phase 2: UI 组件
6. 实现 NavBar 组件（拖拽区，macOS 红绿灯自动适配）
7. 实现 Toolbar 组件（AI 切换标签、Settings 按钮、视图控制按钮）
8. 实现 StatusBar 组件（底部状态信息）
9. MainView 整体布局与样式

### Phase 3: 业务逻辑迁移
10. 迁移 AI 导航/切换逻辑（从 `reaxel_Menu` + `Reaxel_View`）
11. 迁移 Settings 入口逻辑
12. 迁移视图控制逻辑（reload, zoom, devtools, promptview toggle）
13. 迁移关闭/退出逻辑
14. 迁移更新检查逻辑

### Phase 4: 集成与调试
15. 调整 WebContentsView 布局（适配 MainView 工具栏高度）
16. 修复 macOS SSL 证书问题
17. 验证 react-refresh/HMR 在 MainView 中的表现
18. 端到端测试

## 不被迁移的旧 MenuView 技术细节

以下旧 MenuView 的技术实现将在 MainView 重构中**完全丢弃**：
- 自定义 layer 层级管理
- 自定义点击事件处理/事件转发
- 自定义拖拽处理逻辑
- WebContentsView 定位/显隐管理（由新架构的主进程统一管理）
- 任何与 `WebContentsView` 作为菜单容器相关的代码

## 验证标准

- [ ] `yarn build:webpack` 通过，新增 MainView entry 正确输出
- [ ] mainWindow 启动后显示 MainView HTML 界面
- [ ] MainView 工具栏可点击切换 AI 页面
- [ ] Settings 按钮可打开/关闭 SettingsView
- [ ] 所有现有功能（AI 切换、PromptView、缩放、刷新）通过 MainView 正常工作
- [ ] macOS 下 dev Electron 不再报告 ERR_CERT_AUTHORITY_INVALID
- [ ] macOS 红绿灯按钮正确覆盖在 NavBar 区域
- [ ] Windows/Linux 下 MainView 正常显示
- [ ] `tsc -p projects/ChatAIO/tsconfig.json --noEmit` 不因本次改动新增错误
