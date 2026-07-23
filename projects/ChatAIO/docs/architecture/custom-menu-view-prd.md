# MenuView：基于 WebContentsView 的自定义菜单体系

> 产品需求文档（PRD）& 架构规划
> 2026-07-03

---

## 1. 背景与动机

### 1.1 当前方案：Electron 原生 Menu

ChatAIO 目前使用 `electron.Menu.buildFromTemplate()` 构建原生菜单：

| 平台 | 行为 |
|------|------|
| **Windows** | 窗口顶部原生菜单栏（跟随系统主题，不可定制样式） |
| **macOS** | 系统全局菜单栏（屏幕顶部，远离应用窗口） |
| **Linux** | 窗口顶部原生菜单栏 |

### 1.2 原生 Menu 的局限

1. **样式不可控** — 无法实现圆角、动画、图标、自定义配色等现代 UI
2. **布局不灵活** — 无法与应用内容区的 PromptView / FloatingView / SwitchAiBar 等组件产生交互联动
3. **macOS 隔离感** — `titleBarStyle: 'hiddenInset'` 已将内容扩展到标题栏区域，但菜单却在屏幕顶部
4. **无法内嵌 UI** — 无法在菜单中嵌入搜索、状态指示器、快捷操作等动态组件
5. **响应式受限** — 菜单重建 (`rebuildMenu()`) 是全量替换，无法做增量更新或过渡动画
6. **调试困难** — 原生菜单无法使用 React DevTools 调试，菜单逻辑与渲染器状态割裂

### 1.3 目标

> **将 Electron 原生 Menu 重构为基于 `WebContentsView` 的自定义渲染菜单体系。**

- 菜单界面由 React 组件渲染，运行在独立的 WebContentsView 中
- 保持与现有 `reaxel_Menu` 业务逻辑的兼容性（菜单结构、i18n、快捷键）
- 支持 macOS 和 Windows/Linux 双平台差异
- 提供现代交互体验（悬停展开、动画过渡、点击外部关闭）

---

## 2. 设计原则

### 2.1 WebContentsView 优先

- 菜单渲染在 Electron `WebContentsView` 中（而非独立 BrowserWindow），作为 `mainWindow.contentView` 的子视图
- 复用现有的 `initWebContentsView()` 基础设施（preload、keyboard guard、devtools）
- 通过 IPC 与主进程通信，遵循现有的 IPC 规范

### 2.2 分层架构：Layer 体系

```
Z-order (top → bottom):
┌──────────────────────────────────┐
│ FloatingView (独立 BrowserWindow)│ ← alwaysOnTop:true, 'floating' 级别
├──────────────────────────────────┤
│ MenuView    (WebContentsView)    │ ← 新：自定义菜单层
├──────────────────────────────────┤
│ PromptView Left/Right            │ ← WebContentsViews (侧边栏)
├──────────────────────────────────┤
│ AI Views / SettingsView          │ ← WebContentsViews (中心内容区)
└──────────────────────────────────┘
```

### 2.3 渐进增强，非重写

- 复用现有的 `reaxel_Menu`（主进程）中 `createMenu()` 的逻辑来生成菜单结构数据
- 保持现有的 `obsReaction` 响应式机制
- 保持现有的 i18n 和快捷键体系
- **不**修改现有 AI Views / PromptViews / SettingsView 的布局逻辑——只在 contentView 中新增 MenuView 层，并让内容区下移对应的偏移量

---

## 3. 交互与 UX 设计

### 3.1 平台适配

#### Windows / Linux

```
┌──────────────────────────────────────────┐
│ ┌──────┬──────┬───────────┐              │
│ │ File │ View │ Switch AI │ ...          │  ← MenuBar (高度 ~32px)
│ └──────┴──────┴───────────┘              │
│ ┌────────────────────────────────────┐   │
│ │                                    │   │
│ │  Center Content Area               │   │  ← AI Views / SettingsView
│ │  (offset by menu height)           │   │     (y = 32px, height -= 32px)
│ │                                    │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

- 菜单栏横跨窗口顶部全宽，高度 ~32px
- 内容区整体下移菜单栏高度

#### macOS (titleBarStyle: 'hiddenInset')

```
┌──────────────────────────────────────────┐
│ ● ● ●  ┌──────┬──────┬───────────┐      │
│ traffic │ File │ View │ Switch AI │ ...  │  ← MenuBar (高度 ~38px)
│ lights  └──────┴──────┴───────────┘      │
│ ┌────────────────────────────────────┐   │
│ │  Center Content Area               │   │
│ │  (offset by menu height)           │   │  ← y = 38px
│ │                                    │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

- `titleBarStyle: 'hiddenInset'` 下 traffic light 按钮保持原生位置（窗口左上角）
- 菜单栏顶部对齐 traffic light 按钮的底边，右侧留出 ~70px 区域避免遮挡按钮
- 高度略大于 Windows 版以适配 macOS 的视觉节奏

### 3.2 菜单交互模式

#### 展开 / 收起

| 触发方式 | 行为 |
|---------|------|
| **主菜单栏悬停** | 鼠标悬停在菜单顶部项上 → 展开下拉子菜单 |
| **主菜单栏点击** | 点击 → 展开 / 收起（toggle） |
| **子菜单项悬停** | 有子菜单的项悬停 → 展开下一级 |
| **子菜单项点击** | 点击 action 项 → 执行命令 + 关闭所有菜单 |
| **点击菜单外部** | 点击菜单区域外 → 关闭所有已展开的菜单 |
| **Esc 键** | 收起当前层 → 逐层回退 → 最终关闭全部菜单 |

#### 键盘导航

| 快捷键 | 行为 |
|-------|------|
| `Alt` / `F10` | 激活/取消菜单焦点（Windows 标准） |
| `→` / `←` | 相邻主菜单项切换 |
| `↓` / `↑` | 子菜单中上下导航 |
| `Enter` | 激活当前高亮项 |
| `Esc` | 关闭当前层菜单 |
| `Alt+F4` | 关闭窗口（Windows 标准，不受菜单影响） |

#### 弹出策略

- 子菜单默认**向右下**展开
- 当子菜单超出窗口右边界 → **向左**展开
- 当子菜单超出窗口下边界 → 向上展开

### 3.3 视觉风格

- **菜单栏色彩**：默认使用浅灰 / 白色系，减少与亮色网页内容的割裂；深色主题下也保持克制的浅灰菜单 chrome
- **背景**：菜单栏为稳定浅灰底，下拉层为接近白色的半透明面板；支持平台启用 `backdrop-filter: blur()`
- **菜单项**：hover 高亮，active 颜色反馈，禁用项灰色；子菜单 hover 使用短延迟关闭，避免跨层移动时误收起
- **子菜单位置**：相对于父菜单项，带有 `4-8px` 间距和微阴影
- **动画**：展开时 100-150ms 淡入 + 微上移（fadeIn + slideDown），收起时即时隐藏
- **图标**：菜单项可显示图标（现有的 emoji / 自定义 SVG）
- **窗口拖拽**：使用 Electron CSS draggable region；**仅** 6px 顶条（`.main-view-root::before`）、品牌 badge、macOS traffic-light spacer 为 `-webkit-app-region: drag`。栏空白、`drag-tail`、菜单按钮、下拉与菜单项均为 `no-drag`（禁止整栏 / 大块 tail drag，避免内容区 HTCAPTION 泄露；见 `docs/issues/menubar-drag-region-leak-below-content.md`）

---

## 4. 架构设计

### 4.1 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                  Main Process                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              reaxel_Menu (现有 + 扩展)            │    │
│  │  - createMenuData() → 生成菜单结构纯数据 (JSON)  │    │
│  │  - obsReaction → 响应式重建菜单结构              │    │
│  │  - 维护 i18n 实例                                │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │ IPC: 'menu-view:send-structure'│
│                         ▼                                │
│  ┌─────────────────────────────────────────────────┐    │
│  │             reaxel_MenuView (新: 主进程侧)        │    │
│  │  - initMenuView() → 创建 WebContentsView        │    │
│  │  - sendMenuStructure() → IPC 下发菜单数据       │    │
│  │  - handleMenuAction() → IPC 响应菜单操作        │    │
│  │  - manageLayer() → contentView 层级管理         │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │                                │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │  mainWindow.contentView (子 View 容器)           │    │
│  │  [MenuView, PromptView, AIViews, ...]            │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│                  Renderer Process                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │            MenuView (WebContentsView)            │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │  App.tsx (reaxper)                       │    │    │
│  │  │  ├── MenuBar.tsx     → 顶部菜单栏       │    │    │
│  │  │  ├── MenuDropdown.tsx→ 下拉子菜单       │    │    │
│  │  │  └── MenuItem.tsx    → 单个菜单项      │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │  reaxel_MenuView (渲染进程侧)            │    │    │
│  │  │  - store.menuStructure                   │    │    │
│  │  │  - store.openMenuIndex                   │    │    │
│  │  │  - store.hoveredPath                     │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 数据流

```
[状态变化触发]                  [主进程]                      [渲染进程]
(obsReaction 检测到            reaxel_Menu                  reaxel_MenuView (Renderer)
currentAIViewKey/               .createMenuData()           store.menuStructure
AIViews/PromptViews等变化)           │                      store.hoveredIndex
        │                            │ IPC                    store.openDropdown
        ▼                            ▼                              │
reaxel_MenuView          ──────→  sendMenuStructure()               │
在 Main 进程                             │                          │
重新计算菜单结构                           ├── 'menu-view:structure' ──┤
                                         │                          ▼
                                    ┌─────────────────────────────────┐
                                    │  React Components 渲染菜单     │
                                    │  MenuBar → MenuDropdown        │
                                    └──────────┬──────────────────────┘
                                               │ [用户点击菜单项]
                                               ▼
                                    IPC: 'menu-view:action'
                                               │
                                               ▼
                                    Main 进程执行操作
                                    (切换 AI → rebuildMenu / 打开 Settings / 等)
```

### 4.3 层级管理策略

`contentView` 的子 View 顺序决定绘制层级——**最后 `addChildView` 的位于最上层**：

```
ensureLayerOrder() 确保以下顺序（从上到下）:
  1. MenuView          ← 最后添加（最上层）
  2. PromptView Right  ← ...
  3. PromptView Left
  4. AI Views
  5. SettingsView      ← 最先添加（最下层）

策略：在每次 addChildView 后重新排序
方法：removeChildView + addChildView 重新排列
```

**关键行为**：FloatingView 是独立 BrowserWindow（`alwaysOnTop: true, 'floating'`），始终在所有 WebContentsView 之上，无需处理。

---

## 5. 文件结构

### 5.1 新增 / 修改文件清单

#### 渲染进程（Renderer）— 新 View

```
src/Views/MenuView/                     ← 新目录
  index.tsx                             渲染入口（createRoot + render）
  App.tsx                               主组件（reaxper）
  index.less                            样式（全局 + 主题变量）
  tsconfig.json                         类型配置（参考 FloatingView/tsconfig.json）
  g.d.ts                                全局声明
  reaxels/
    menu-view/
      index.ts                          reaxel（渲染进程侧状态管理）
  （当前实现先保持单 App 文件，后续组件复杂度上升时再拆分 components/）
```

#### 主进程（Main）— 新增

```
src/Main/reaxels/Views/Menu-View/
  index.ts                              reaxel_MenuView（主进程侧：创建 View、IPC、层级管理）
```

#### 类型定义（Types）

```
src/Types/
  MenuView.d.ts                        ← 新：MenuView 类型定义（菜单项结构、IPC 载荷）
```

#### 渲染入口注册

```
src/shared/renderer-entries.ts
  → 新增：MenuView : 'src/Views/MenuView/index.tsx'
```

#### IPC 通道

```
src/Types/IpcSchema.d.ts
  → 新增 MainToRenderer 事件：
    - 'menu-view:command' : MtrEvent<[MenuView.MenuCommand]>
  → 新增 RendererToMain 事件：
    - 'menu-view:action' : RtmEvent<[MenuView.Action]>
    - 'menu-view:ready' : RtmEvent<[void]>
    - 'menu-view:resize' : RtmEvent<[number]>
```

#### preload 暴露

```
src/preload.ts
  → 新增 API：
    - onMenuViewCommand(callback)           // Main→Renderer 菜单命令
    - menuViewAction(action)                // Renderer→Main 菜单操作
    - menuViewReady()                       // Renderer 就绪通知
    - menuViewResize(height)                // 展开/关闭时调整 WebContentsView 高度
```

#### 主进程 IPC 注册

```
src/Main/services/ipc/index.ts
  → useIpcMainToRenderer('menu-view:command')
  → useIpcRendererToMain('menu-view:action')
  → useIpcRendererToMain('menu-view:ready')
  → useIpcRendererToMain('menu-view:resize')
```

### 5.2 需要修改的现有文件

| 文件 | 修改内容 |
|------|---------|
| `src/shared/renderer-entries.ts` | 新增 `MenuView` 条目 |
| `src/preload.ts` | 新增 MenuView 相关 API |
| `src/Types/IpcSchema.d.ts` | 新增 MenuView IPC 通道类型 |
| `src/Main/services/ipc/index.ts` | 注册 MenuView IPC handler |
| `src/Main/runtime.ts` | 在 `startMainRuntime` 中调用 `reaxel_MenuView().init()` |
| `src/Main/reaxels/Menu/index.ts` | 新增 `createMenuData()` 方法返回纯数据（替换 `createMenu()` 返回 native Menu） |
| `src/Main/reaxels/Views/index.ts` | 修改布局偏移逻辑以包含 MenuView 高度 |
| `src/Main/reaxels/Views/utils/initWebContentsView.ts` | 新增 `Menu-View` 类型处理 |

---

## 6. 关键技术设计

### 6.1 菜单数据结构

```typescript
// src/Types/MenuView.d.ts

export namespace MenuView {
  /** 菜单项类型 */
  export type ItemType = 'normal' | 'separator' | 'checkbox' | 'radio';

  /** 单个菜单项（纯数据，可序列化跨 IPC） */
  export interface Item {
    id: string;                    // 唯一标识
    label: string;                 // 显示文本（已 i18n 处理）
    type: ItemType;
    accelerator?: string;          // 快捷键文本（用于显示，非实际绑定）
    enabled: boolean;
    checked?: boolean;             // 用于 checkbox / radio
    icon?: string;                 // 可选 emoji / icon identifier
    submenu?: Item[];              // 子菜单（递归）
    action?: string;               // 操作标识符（主进程根据此执行逻辑）
    actionPayload?: unknown;       // 操作附加数据（如 AI 切换时的 AI ID）
  }

  /** 完整菜单结构 = 顶级菜单项数组 */
  export type Structure = TopLevelItem[];

  /** 顶级菜单项（有展开的子菜单列表） */
  export interface TopLevelItem {
    id: string;
    label: string;
    submenu: Item[];
    enabled: boolean;
  }

  /** 用户操作 */
  export interface Action {
    type: 'execute' | 'toggle';
    itemId: string;                // 直接操作项 ID
    action?: string;               // 执行的操作标识
    payload?: unknown;             // 操作参数
  }
}
```

### 6.2 reaxel_Menu 改造（主进程）

现有的 `reaxel_Menu` 需**新增** `createMenuData()` 方法——它产生与 `createMenu()` 相同的菜单结构，但以序列化 JSON 数据形式输出，而非 `electron.Menu` 实例：

```typescript
// reaxel_Menu 新增方法
function createMenuData(): MenuView.Structure {
  // 1. 与 createMenu() 相同的业务逻辑
  const settings = getRuntimeSettings();
  const enabledAIs = settings.AIs.filter(ai => !ai.disabled);
  
  // 2. 返回纯数据而非 Menu.buildFromTemplate()
  return [
    {
      id: 'application',
      label: t('Application'),
      submenu: [
        {
          id: 'settings',
          label: t('Settings'),
          type: 'normal',
          enabled: true,
          action: 'open-settings',
        },
        { id: 'sep-1', type: 'separator' } as MenuView.Item,
        // ...
      ],
    },
    // ...
  ];
}
```

### 6.3 布局偏移

现有的 `Reaxel_View.fitWindow()` 和 `getCenterBounds()` 将中心视图的 `y` 和 `height` 调整为包含 PromptView 边距。现在需额外减去 MenuView 高度：

```typescript
const MENU_VIEW_HEIGHT = process.platform === 'darwin' ? 38 : 32;

function getCenterBounds(bounds = mainWindow.getContentBounds()): Rectangle {
  const promptInsets = reaxel_PromptViews().getLayoutInsets();
  return {
    x: promptInsets.left,
    y: MENU_VIEW_HEIGHT,      // ← 新增：减去菜单栏高度
    width: Math.max(1, bounds.width - promptInsets.left - promptInsets.right),
    height: Math.max(1, bounds.height - MENU_VIEW_HEIGHT),  // ← 新增
  };
}
```

### 6.4 交互逻辑：点击外部关闭

MenuView 需要监听自身 WebContents 的 `blur` 事件或 `before-input-event` 来实现点击外部关闭：

```typescript
// MenuView 渲染进程
useEffect(() => {
  const handleClickOutside = () => {
    // 点击非菜单区域 → 关闭展开的菜单
    setState({ openMenuIndex: -1 });
  };
  
  // 通过 IPC 监听主进程的 "content-view-click" 事件
  const disposable = api.onContentViewClick(handleClickOutside);
  return () => disposable.dispose();
}, []);
```

### 6.5 切换 AI View 时的菜单重建

当前 `reaxel_Menu` 中 `obsReaction` 监听状态变化触发 `rebuildMenu()`。迁移后：

```typescript
obsReaction((first) => {
  if (first) return;
  // 不再调用 Menu.setApplicationMenu()
  // 改为通过 IPC 将菜单结构数据发送到 MenuView 渲染进程
  reaxel_MenuView().sendMenuStructure(reaxel_Menu().createMenuData());
}, () => [
  Reaxel_View.store.currentAIViewKey,
  Reaxel_View.store.settingsViewOpened,
  reaxel_AIViews.store.AIViews.length,
  reaxel_PromptViews.store.left.visible,
  reaxel_PromptViews.store.right.visible,
]);
```

---

## 7. 阶段实施计划

### Phase 1 — 基础设施（P0）
- [x] 创建 `dev/MenuView` 分支
- [ ] 注册 `MenuView` 到 `renderer-entries.ts`
- [ ] 创建 `src/Views/MenuView/` 目录及文件骨架
- [ ] 创建 `src/Types/MenuView.d.ts` 类型定义
- [ ] 添加 IPC 通道定义到 `IpcSchema.d.ts`
- [ ] 在 `preload.ts` 暴露 MenuView API
- [ ] 注册主进程 IPC handlers
- [ ] 创建 `src/Main/reaxels/Views/Menu-View/index.ts`

### Phase 2 — 菜单业务逻辑（P0）
- [ ] 在 `reaxel_Menu` 中新增 `createMenuData()` 方法
- [ ] 确保菜单结构包含所有现有菜单项（Application、View、Switch AI）
- [ ] 保持 i18n 兼容性
- [ ] 保持快捷键标签显示

### Phase 3 — 渲染组件（P0）
- [ ] 实现 `MenuBar` 组件（顶部菜单栏）
- [ ] 实现 `MenuDropdown` 组件（下拉子菜单）
- [ ] 实现 `MenuItem` 组件（菜单项，支持 normal/separator/checkbox/radio）
- [ ] 实现悬停展开 + 点击 toggle 交互
- [ ] 实现键盘导航
- [ ] 实现点击外部关闭

### Phase 4 — 集成（P1）
- [ ] 修改 `Reaxel_View` 布局逻辑加入 MenuView 高度偏移
- [ ] 将 MenuView 添加到 `initRuntimeViews` 流程
- [ ] 实现 WebContentsView 层级管理（`ensureLayerOrder()`）
- [ ] macOS traffic light 区域适配
- [ ] 连接 `obsReaction` → IPC → 渲染的完整数据流

### Phase 5 — 打磨（P2）
- [ ] 动画效果（淡入 / 位移）
- [ ] 毛玻璃背景
- [ ] 平台特定的精细调整
- [ ] 边缘情况处理：全屏模式、最小化恢复、DPI 变化
- [ ] 移除旧的 native Menu 代码（保留作为 fallback？或完全替换）

---

## 8. 与现有系统的一致性检查

| 检查项 | 策略 |
|--------|------|
| **IPC 规范** | ✅ 所有通信通过 `IpcSchema.d.ts` 类型化，使用 `useIpcRpc` / `useIpcMainToRenderer` / `useIpcRendererToMain` |
| **import 位置** | ✅ 所有 import 放文件底部|
| **缩进风格** | ✅ Tab / 3空格保持一致|
| **Reaxel 命名** | ✅ `reaxel_MenuView`遵循`reaxel_`前缀约定 |
| **组件命名** | ✅ `MenuBar`, `MenuDropdown`, `MenuItem` |
| **reaxper 包装** | ✅ 所有组件用 `reaxper()` |
| **WebContentsView** | ✅ 使用 `initWebContentsView()` 基础设施 |
| **preload 隔离** | ✅ 渲染进程通过 `window.api` 通信 |
| **cloneForIPC** | ✅ 主进程 `createMenuData()` 首次下发为 plain JSON；**进入 `reaxel_MainView.store` 后变为 observable**。凡 Renderer → Main（`openDropdownView`、`menuViewAction` 等）及主进程转发 DropdownView 前，**必须** `cloneForIPC`。详见 `.qoder/rules/ipc-coding.md`「Store 往返」 |
| **React hooks** | ✅ 通过 ProvidePlugin 全局注入，无需显式 import |
| **Way A 业务逻辑** | ✅ 菜单 action 使用 Way A（命令式），主进程 `reaxel_MenuView` 显式处理 action → setState → follow-up |

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **WebContentsView 的点击穿透** | 菜单关闭后点击可能穿透到下方 AI 页面 | 设置 `view.setVisible(false)` 或监听 blur 事件 |
| **macOS traffic light 遮挡** | 菜单栏覆盖窗口按钮 | 右侧预留 ~70px 空白区域；使用 CSS `-webkit-app-region: drag` / `no-drag` |
| **键盘事件冲突** | Alt 键触发菜单 vs Alt+, / Alt+. PromptView 快捷键 | 调整 `window-keyboard.ts` 的 `preventSingleAltMenuFocus` 逻辑 |
| **全屏模式 (F11)** | 菜单栏在全屏时需隐藏 | 监听 `mainWindow` 的 fullscreen 事件，隐藏 MenuView |
| **拖拽 (titleBarStyle)** | `app-region: drag` 会吞掉 pointer events；过大 drag 面还会把 HTCAPTION 泄露到下方 AI WCV | 只保留 6px 顶条 + badge + macOS spacer 可拖；栏空白 / drag-tail / center 容器 / 按钮 / 下拉全部 `no-drag`；不使用 JS 手写 `setPosition()`；勿为交互问题把整栏改回 drag |
| **性能** | 菜单结构重建频繁 | `obsReaction` 已自带浅比较去重；`createMenuData()` 是纯函数调用，开销低 |
| **多显示器** | 菜单位置错位 | WebContentsView 绑定到 mainWindow.contentView，自动跟随主窗口 |

---

## 10. 参考实现

### 10.1 开源参考

- **VS Code 的自定义标题栏 + 菜单栏**：Electron 实现 `titleBarStyle: 'custom'` 的典型案例，使用 `custom-title-bar` 样式覆盖来实现拖拽、菜单、traffic light 共存
- **Beekeeper Studio** (开源 Electron SQL 客户端)：使用自定义菜单栏渲染，React 实现
- **Zed Editor** (GPUI)：虽然不是 Electron，但其菜单栏的交互设计和层级管理值得借鉴
- **Figma (桌面版)**：使用 WebContentsView 或 BrowserView 实现自定义 UI 的典型案例

### 10.2 核心 Electron API

- `WebContentsView` (Electron 31+) — 轻量级 View，可嵌入 `BrowserWindow.contentView`
- `contentView.addChildView(view)` / `contentView.removeChildView(view)` — 子视图层级管理
- `titleBarStyle: 'hiddenInset'` — macOS 内容延伸到标题栏
- `setWindowOpenHandler` — 控制弹窗行为

### 10.3 调研结论

本次实现依据以下资料校正架构边界：

- Electron 官方文档确认 `WebContentsView` 是承载 `WebContents` 的 `View`，应由主进程创建并通过 `contentView.addChildView()` 挂入窗口；`View.addChildView(view)` 对已存在子 view 再次调用时会把它调整到最上层。因此 MenuView 的层级策略不需要维护私有 z-index，只需要在 AI/Settings/Prompt 等 view 变更后重复 add 即可。
- Electron `View.setBounds()` 的坐标相对父 view，MenuView 下拉菜单如果继续存在同一个 `WebContentsView` 内，就必须在展开时扩展 bounds，否则 DOM 下拉层会被 native view 裁剪。关闭菜单后必须恢复到菜单栏高度，避免长期截获内容区事件。
- VS Code 自定义 menubar 的关键经验不是视觉样式，而是状态管理：菜单获得焦点时延迟更新菜单项，失焦或窗口 resize 时关闭菜单，Alt/F10 进入菜单焦点，左右键切换顶级菜单，上下键在菜单项之间移动。这些行为比单纯 hover 更接近桌面应用菜单。
- `custom-electron-titlebar` 一类开源库适合参考 titlebar/menu 的 DOM 组织，但 ChatAIO 已经有 WebContentsView、typed IPC、Reaxes 和多入口构建体系，直接引库会引入不必要的架构分叉。因此本方案只吸收其“titlebar 区域与菜单交互区分离”的 UX 经验，不新增依赖。
- Electron draggable region 文档强调 `app-region: drag` 会忽略鼠标点击、进入和离开事件，因此 MenuView 不应在 JS 中手写拖拽窗口坐标，也不应把整层 WebContentsView / 整栏设为可拖。正确做法是将拖拽区域收束到 **6px 顶条 + badge +（macOS）spacer**，栏空白与菜单按钮、下拉层全部 `no-drag`（详见 `docs/issues/menubar-drag-region-leak-below-content.md` §5.2）。
- VS Code menubar 打开菜单时采用 `mousedown` 触发，并对后续 `mouseup` 做状态隔离；顶级菜单只在已有菜单打开时通过 `mouseenter` 横向切换。MenuView 采用同类策略：顶级按钮 `mousedown` toggle，展开后 hover 切换，点击下拉外的 MenuView 空白区关闭。

由此确定的实现原则：

- Windows/Linux 不再设置 Electron 原生窗口菜单；快捷键由现有 `before-input-event` / 全局快捷键体系接管。
- macOS 仍可保留应用级原生菜单作为系统菜单栏 fallback，但窗口内菜单以 MenuView 为主路径。
- MenuView 创建必须接入现有 `initWebContentsView()`，统一 crash reporter、keyboard guard、dev renderer URL 和生产 HTML 路径。
- MenuView 展开时置顶并扩展高度，关闭、blur、resize、执行 action 后恢复高度。
- 子菜单 hover 跨层移动使用短延迟关闭，避免鼠标从父项移动到固定定位子菜单时因为像素间隙导致无故关闭。

---

## 11. 验收标准

1. [ ] 自定义菜单栏在 Windows 上显示并工作正常
2. [ ] 自定义菜单栏在 macOS 上显示并工作正常（traffic light 未遮挡）
3. [ ] 所有现有菜单项（Application → Settings/Quit, View → Reload/DevTools/PromptViews/Zoom/Wipe/Close, Switch AI → AI 列表/Prev/Next）均可正常使用
4. [ ] 快捷键（Ctrl+W、Ctrl+R、F12、Alt+[, Alt+]、Alt+,, Alt+.）不受影响
5. [ ] `obsReaction` 驱动菜单重建：切换 AI、开关 Settings、开关 PromptView 均实时反映
6. [ ] i18n 切换后菜单文本立即更新
7. [ ] 点击菜单外部区域，下拉菜单关闭
8. [ ] 键盘导航（方向键、Enter、Esc）正常工作
9. [ ] 全屏模式不显示菜单栏
10. [ ] 窗口拖拽和 resize 不影响菜单位置
