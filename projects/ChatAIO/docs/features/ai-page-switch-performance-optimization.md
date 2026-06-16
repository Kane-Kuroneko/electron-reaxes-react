# AI Page 切换性能优化

> 2026-06-16 — 深度排查频繁切换 AI Page 时的 CPU 性能占用问题

## 问题描述

用户频繁使用快捷键（Ctrl+[/]、Alt+[/]）切换 AI 页面时，观察到明显的 CPU 性能占用和界面响应延迟。

## 根因分析

### 发现的性能缺陷

#### 1. AI View 缺少 z-order 管理（置顶方式缺陷）

**现状**：`applyVisibility()` 仅调用 `view.setVisible(true/false)` 来切换显示/隐藏，从不调用 `mainWindow.contentView.addChildView(view)` 将当前 view 置于顶层。

**对比**：`openSettingsView()`（`runtime.ts:77`）正确使用了 `mainWindow.contentView.addChildView(settingsView)` 来将 Settings 视图置顶。但 AI 视图切换从未使用此模式。

**影响**：依赖 `setVisible(false)` 隐藏其他 views 来间接实现"置顶"，缺少显式的 z-order 保障。在极端情况下（如 view 创建顺序、隐藏/显示时序竞争）可能导致错误的 view 显示在最上层。

**Electron 行为**：`contentView.addChildView(view)` 对已添加的 view 是幂等的——会先移除再重新添加到末尾（即最顶层）。这是 Electron 推荐的置顶方式。

#### 2. `applyVisibility()` 双重调用

**调用链**：
1. `showAIView()` / `turnToInstantiatedAiPageByOffset()` 直接调用 `applyVisibility()`（同步）
2. `setState({currentAIViewKey})` → MobX reaction 触发 → `obsReaction` 回调调用 `applyVisibility()` 第二次（microtask 异步）

**影响**：每次切换 AI 页面，`applyVisibility()` 被执行两次。第一次是有效调用，第二次在 microtask 中完全冗余——遍历所有 AI views 并重复调用 `setVisible()`。

#### 3. `fitWindow()` 遍历全部视图（切换时不必要的全量布局）

**现状**：`obsReaction` 在 `currentAIViewKey` 变化时调用 `fitWindow()`（无 target 参数版本），该函数遍历**所有** AI views、Settings view、Prompt views 并逐一设置 bounds。

**影响**：每次切换都要对 N 个 AI views 执行 `getBounds()` + `isSameBounds()` + 可能 `setBounds()`。对于 5-10 个已加载的 AI views，这是 O(N) 的无效遍历——切换时只需更新当前显示的 view 的 bounds。

#### 4. `floatingWindow.moveTop()` 每次切换都调用

**现状**：`showLayerWindow()` 在每次显示 SwitchAiBar 时都调用 `moveTop()`。该函数通过 `queueOrSendCommand()` → `showLayerWindow()` 被每个切换操作触发。

**影响**：`moveTop()` 是 OS 级别的窗口 z-order 操作，涉及系统调用，相对昂贵。FloatingView 已设置 `alwaysOnTop: true, 'floating'` 级别，在应用内部不需要每次切换都调用 `moveTop()`。

#### 5. `showLayerWindow()` 冗余的 `syncBounds()` 调用

**现状**：`showLayerWindow()` 每次调用都执行 `syncBounds()`，读取 `mainWindow.getContentBounds()` 并设置 FloatingView bounds。

**影响**：FloatingView 的 bounds 同步已通过 `mainWindow.on('move'/'resize'/'maximize'/'unmaximize', syncBounds)` 事件监听覆盖。快速切换 AI 页面时 bounds 不会改变，`syncBounds()` 完全是冗余操作。

### 性能开销量化估计

以 6 个已加载 AI views 为例，每次切换的开销：

| 操作 | 当前次数 | 优化后次数 | 节省 |
|------|---------|-----------|------|
| `view.getBounds()` | 6×2 = 12 | 1 | 91% |
| `view.setBounds()` | 0-6×2 | 0-1 | ~90% |
| `view.setVisible()` | 6×2 = 12 | 6 | 50% |
| `view.getVisible()` | 6×2 = 12 | 6 | 50% |
| `floatingWindow.moveTop()` | 1 | 0 | 100% |
| `mainWindow.getContentBounds()` | 1 (fitWindow) + 1 (syncBounds) = 2 | 1 | 50% |
| `contentView.addChildView()` | 0 | 1 | 新增（必要） |

## 技术方案

### 修改范围

- `src/Main/reaxels/Views/index.ts` — Reaxel_View（核心优化）
- `src/Main/reaxels/Views/AI-Views/index.ts` — reaxel_AIViews（z-order + 去重）
- `src/Main/reaxels/Views/FloatingView/index.ts` — reaxel_FloatingView（moveTop/syncBounds 优化）

### 方案 1：添加显式 z-order 管理

在 `applyVisibility()` 中，当设置 AI view 为可见时，调用 `mainWindow.contentView.addChildView(view)` 将其置顶。

```typescript
// AI-Views/index.ts — applyVisibility()
const applyVisibility = () => {
    const currentAIViewKey = Reaxel_View.store.currentAIViewKey;
    store.AIViews.forEach( runtimeView => {
        if( !runtimeView.view ) return;
        const visible = !Reaxel_View.store.settingsViewOpened && runtimeView.id === currentAIViewKey;
        if( visible ) {
            // 显式置顶当前 AI view（Electron 推荐方式）
            mainWindow.contentView.addChildView( runtimeView.view );
        }
        runtimeView.view.setVisible( visible );
        if( visible ) {
            focusRuntimeAIViewIfReady( runtimeView );
        }
    } );
};
```

**注意**：`addChildView` 必须在 `setVisible(true)` 之前调用，以确保 view 在显示时已处于正确的 z-order 位置。但实际上 Electron 中 `addChildView` 对可见性无要求，在 `setVisible` 之前或之后调用均可。为保持代码清晰，将 `addChildView` 放在 `setVisible` 之前。

### 方案 2：消除 `applyVisibility()` 双重调用

使用轻量级的"已应用"标记，在 `obsReaction` 中跳过刚被同步调用过的 `applyVisibility()`。

```typescript
// Views/index.ts — Reaxel_View
let visibilityAppliedSynchronously = false;

// 包装 applyVisibility
const applyVisibilityOnce = () => {
    if( visibilityAppliedSynchronously ) return;
    reaxel_AIViews().applyVisibility();
};
```

在 `showAIView()` 和 `turnToInstantiatedAiPageByOffset()` 中设置标记。

### 方案 3：优化 `fitWindow()` 在切换时的行为

将 `obsReaction` 中的 `fitWindow()` 替换为仅更新当前中心视图 bounds 的轻量操作。

```typescript
// Views/index.ts — obsReaction
obsReaction( ( first ) => {
    if( first ) return;
    // 切换时仅更新当前中心视图的 bounds，而非全量布局
    fitCurrentCenterView( getCenterBounds() );
    reaxel_SettingsView.store.settingsView.view?.setVisible( store.settingsViewOpened );
    reaxel_AIViews().applyVisibility();
}, () => [ store.settingsViewOpened , store.currentAIViewKey ] );
```

`fitWindow()` 全量布局保留给 resize 事件使用（已在 `mainWindow.on('resize', fitWindow)` 中注册）。

### 方案 4：移除 FloatingView 冗余操作

```typescript
// FloatingView/index.ts — showLayerWindow()
const showLayerWindow = () => {
    const floatingWindow = store.floatingView.window;
    if( !floatingWindow || floatingWindow.isDestroyed() ) return;
    // syncBounds() 移除 —— 由 mainWindow 事件监听覆盖
    if( mainWindow.isVisible() && !mainWindow.isMinimized() ) {
        floatingWindow.showInactive();
        // moveTop() 移除 —— alwaysOnTop: true, 'floating' 已保证层级
    }
};
```

`moveTop()` 保留在 `mainWindow.on('show'/'restore'/'focus', showLayerWindow)` 事件路径中，仅在窗口从隐藏/最小化恢复时触发，而非每次切换。

### 方案 5：`applyVisibility()` 早期退出优化

当没有变化时跳过遍历：

```typescript
let lastAppliedKey: string | null = null;
let lastSettingsOpened: boolean | null = null;

const applyVisibility = () => {
    const currentKey = Reaxel_View.store.currentAIViewKey;
    const settingsOpened = Reaxel_View.store.settingsViewOpened;
    if( currentKey === lastAppliedKey && settingsOpened === lastSettingsOpened ) {
        return; // 状态未变，跳过
    }
    lastAppliedKey = currentKey;
    lastSettingsOpened = settingsOpened;
    // ... 现有逻辑
};
```

## 架构影响评估

### 兼容性
- 所有修改在 reaxel 模块内部，不影响外部 API
- `Reaxel_View` 的 `rtn` 接口不变
- `reaxel_AIViews` 的 `rtn` 接口不变
- IPC 通信不变

### 风险
- **低风险**：z-order 管理、fitWindow 优化、moveTop 移除
- **中风险**：applyVisibility 双重调用消除 —— 需确保所有调用路径都被覆盖
- **缓解**：保留 `obsReaction` 中的 `applyVisibility()` 作为兜底，添加早期退出优化

## 验证方式

1. 启动 ChatAIO，打开 6+ AI pages
2. 频繁使用 Ctrl+[/] 快速切换已加载的 AI pages
3. 观察 CPU 占用（Windows 任务管理器 / Electron devtools Performance monitor）
4. 确认 FloatingView 切换卡片动画流畅，无卡顿
5. 确认切换后当前 AI page 正确显示在最上层
6. 确认 Settings 打开/关闭时 z-order 正确（Settings 覆盖 AI view）
7. 确认 Prompt views 展开/收起时不影响中心视图 z-order
