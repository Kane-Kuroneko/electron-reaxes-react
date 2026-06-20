# AI View Focus-Stealing Analysis & Runtime Detection

> 产品文档 — 分析 ChatAIO 多 AI WebContentsView 场景下的焦点窃取风险及运行时检测方案
> 创建日期：2026-06-20

---

## 1. 问题定义

### 1.1 用户场景

ChatAIO 作为 Electron 宿主窗口，同时托管多个 AI 服务页面（ChatGPT、Gemini、Claude、Grok、DeepSeek 等），每个 AI 服务运行在独立的 `WebContentsView` 中。用户在某一个 AI 页面的输入框/对话框中输入内容时，如果**其他 AI 视图**发生了 `load` / `loaded` 事件（后台预加载、导航完成、刷新等），可能导致当前视图的**活动输入元素失去焦点**，打断用户输入。

### 1.2 影响范围

- **用户体验**：正在输入的文本突然失去焦点，击键被非预期目标接收
- **功能完整性**：某些 AI 服务的对话框可能是模态的（如 ChatGPT 的弹窗），失焦可能导致弹窗关闭
- **多视图场景**：设置变更触发 `syncAIViewsWithConfig`、后台预加载其他 AI、Settings 变更导致 reload、代理配置更新导致的 reload 等

### 1.3 核心问题

```
用户正在 AI View A 的 <textarea> 中输入
   ↓
另一个 AI View B 发生 load/loaded 事件
   ↓（可能）
AI View A 的文本输入失去焦点
   ↓
用户需要重新点击输入框才能继续输入
```

---

## 2. 架构分析

### 2.1 视图架构总览

```
mainWindow (BrowserWindow)
  ├── contentView (View)
  │     ├── AI View A (WebContentsView) ← 当前视图
  │     ├── AI View B (WebContentsView) ← 后台预加载
  │     ├── AI View N (WebContentsView)
  │     ├── Settings View (WebContentsView)
  │     ├── Prompt View Left (WebContentsView)
  │     └── Prompt View Right (WebContentsView)
  │
  ├── FloatingView (BrowserWindow, transparent overlay, focusable: false)
  │     └── SwitchAiBar (Swiper 12 carousel)
  │
  └── GuidingView (BrowserWindow, first-launch wizard)
```

### 2.2 焦点管理关键路径

#### 2.2.1 AI 视图创建

文件：`src/Main/reaxels/Views/utils/initWebContentsView.ts`

```
initWebContentsView()
  → new WebContentsView(viewOptions)
  → mainWindow.contentView.addChildView(view)  ← 新视图被添加到顶层
  → view.webContents.loadURL(url)               ← 开始加载
  → did-finish-load → refreshBounds()           ← 布局更新
```

后台预加载的视图在 `syncAIViewsWithConfig()` 中被创建，在执行到 `applyVisibility()` 隐藏非当前视图之前，**新创建的视图是可见且位于顶层的**。

#### 2.2.2 did-stop-loading → 焦点处理

文件：`src/Main/reaxels/Views/AI-Views/index.ts:268-280`

```
bindRuntimeAIViewReadyHandlers(aiId, view):
  view.webContents.on('did-stop-loading', markViewReady)
  view.webContents.on('did-fail-load', markViewReady)

markViewReady():
  → setState: runtimeView.ready = true
  → focusAIViewIfCurrent(aiId, view)
```

#### 2.2.3 focusAIViewIfCurrent() 守卫

文件：`src/Main/reaxels/Views/AI-Views/index.ts:516-525`

```typescript
const focusAIViewIfCurrent = (aiId, view) => {
  // 守卫 1: 不是当前视图 → 忽略
  if (Reaxel_View.store.currentAIViewKey !== aiId) return;
  // 守卫 2: Settings 打开 → 忽略
  if (Reaxel_View.store.settingsViewOpened) return;
  // 守卫 3: 主窗口未聚焦 → 忽略
  if (!mainWindow.isFocused()) return;
  // 调用 view.webContents.focus()
  focusAIViewIfReady(view);
};
```

#### 2.2.4 applyVisibility() → 焦点处理

文件：`src/Main/reaxels/Views/AI-Views/index.ts:180-212`

```
applyVisibility():
  → 遍历 store.AIViews
  → 当前视图: addChildView(置顶) + setVisible(true) + focusRuntimeAIViewIfReady()
  → 非当前视图: setVisible(false)

focusRuntimeAIViewIfReady(runtimeView):
  → 检查 runtimeView.ready
  → 检查 isDestroyed() 和 isLoading()
  → view.webContents.focus()                      ← 显式调用
```

#### 2.2.5 其他焦点操作

文件：`src/Main/reaxels/Views/index.ts:62-69`

```
focusCurrentContentView():
  → mainWindow.focus()
  → view.webContents.focus()

// Prompt-Views 关闭时调用
finishAnimation():
  → finalVisible ? sideState.view.webContents.focus()
                 : Reaxel_View().focusCurrentContentView()
```

### 2.3 已知守卫机制

| 守卫 | 位置 | 保护范围 |
|------|------|----------|
| `currentAIViewKey !== aiId` | `focusAIViewIfCurrent()` | 阻止非当前视图的 load 事件窃取焦点 |
| `settingsViewOpened` | `focusAIViewIfCurrent()` | 阻止 Settings 打开时窃取焦点 |
| `!mainWindow.isFocused()` | `focusAIViewIfCurrent()` | 阻止主窗口未聚焦时窃取焦点 |
| `runtimeView.ready` | `focusRuntimeAIViewIfReady()` | 阻止视图未就绪时聚焦 |
| `isLoading()` | `focusAIViewIfReady()` | 阻止加载中的视图自动聚焦 |
| `isDestroyed()` | `focusAIViewIfReady()` | 阻止已销毁视图操作 |

---

## 3. 缺陷分析

### 3.1 已确认安全的路径

- ✅ **非当前视图的 `did-stop-loading`** → `focusAIViewIfCurrent()` 因 `currentAIViewKey !== aiId` 返回 → **无焦点窃取**
- ✅ **FloatingView 创建/显示/隐藏** → `focusable: false` + `setIgnoreMouseEvents(true)` → **无焦点窃取**
- ✅ **Settings 打开时** → `focusAIViewIfCurrent()` 被 `settingsViewOpened` 阻挡 → **无焦点窃取**
- ✅ **主窗口未聚焦时** → `focusAIViewIfCurrent()` 被 `!mainWindow.isFocused()` 阻挡 → **无焦点窃取**

### 3.2 需要运行时验证的路径

#### ⚠️ Path A: 当前视图自身的 `did-stop-loading` → `focusAIViewIfCurrent()`

```
用户正在 AI View A 的 <textarea> 中输入
  → AI View A 发生 did-stop-loading（导航、刷新等）
  → markViewReady() 调用 focusAIViewIfCurrent(A.id, A.view)
  → 守卫通过（是当前视图、非 settings 模式、主窗口聚焦）
  → view.webContents.focus()   ← 当前视图上的 focus()
  → Chromium 内部机制：可能会分发 blur 事件给当前活动元素
  → 活动输入元素可能失去焦点 ⚠️
```

**不确定性**：`webContents.focus()` 在已聚焦的 `WebContentsView` 上被调用时，是否会向渲染进程分发 `blur` 事件导致输入元素失焦，取决于 Electron/Chromium 版本和平台的具体实现。

#### ⚠️ Path B: `applyVisibility()` 中的 `focusRuntimeAIViewIfReady()`

```
用户正在 AI View A 的对话框（如 ChatGPT modal）中操作
  → settings 变更导致 syncAIViewsWithConfig() → applyVisibility()
  → 对 AI View A 调用 focusRuntimeAIViewIfReady()
  → view.webContents.focus()   ← 当前视图上的 focus()
  → Chromium 可能会将焦点从 modal dialog 内的 input 移到 document body
```

#### ⚠️ Path C: 后台预加载视图创建时短暂可见

```
syncAIViewsWithConfig():
  → 为 Gemini 调用 initAIView()
  → initWebContentsView():
    → mainWindow.contentView.addChildView(geminiView)  ← Gemini 视图被添加到顶层且可见
    → 开始加载 URL
  → 循环继续...
  → applyVisibility(): 隐藏 Gemini，置顶 ChatGPT

# Gemini 视图在创建到 applyVisibility 之间是可见且顶层的，
# Chromium 的新视图焦点策略可能在此期间影响焦点状态
```

#### ⚠️ Path D: Prompt View 关闭 → `focusCurrentContentView()`

```
finishAnimation() → Reaxel_View().focusCurrentContentView()
  → mainWindow.focus()
  → view.webContents.focus()

# mainWindow.focus() 可能触发 OS 级别的窗口焦点变化，
# 导致渲染进程内的焦点状态改变
```

### 3.3 关键不确定性

以上 A、B、C、D 路径中，焦点窃取是否真正发生取决于 Chromium 的行为，无法通过主进程代码分析确定：

1. **`webContents.focus()` 在已聚焦 WebContentsView 上的行为**：
   - Chromium `RenderWidgetHostView::Focus()` 在不同版本中实现不同
   - 某些版本会分发 `focus`/`blur` 事件到渲染进程
   - 某些版本是 no-op（已聚焦则不操作）

2. **`mainWindow.focus()` + `webContents.focus()` 的复合效应**：
   - `BrowserWindow.focus()` 可能触发 OS 窗口管理器的焦点变化
   - OS 窗口焦点变化可能传递到子视图

3. **跨来源 `executeJavaScript()` 限制**：
   - 远程 AI 页面（跨来源）无法通过 `executeJavaScript()` 从主进程访问其 DOM
   - 需要通过 `ai-page-preload.ts` 的 preload 上下文来桥接

---

## 4. 运行时检测方案（Retexel）

### 4.1 Retexel 定义

**Retexel** = **ReaXes TEst Module**，是可实例化的测试模块：
- 非单例：可通过 `Refaxel_` 模式创建多个实例
- 可注入：与 `reaxel` 并行使用，监控运行时行为
- 非侵入式：不修改生产逻辑，仅添加观测层
- 可开关：通过配置启用/禁用检测

### 4.2 检测架构

```
┌────────────────────────────────────────────────────┐
│ Main Process                                        │
│                                                     │
│  AI-Views/index.ts                                  │
│    ├── focusAIViewIfCurrent() → FocusMonitor.wrap() │
│    ├── applyVisibility()      → FocusMonitor.wrap() │
│    └── focusCurrentView()     → FocusMonitor.wrap() │
│                                                     │
│  FocusMonitor (retexel)                              │
│    ├── wrap(originalFn, viewId, source)             │
│    │     └── before: git focus state via sync IPC    │
│    │     └── execute: originalFn()                   │
│    │     └── after:  poll focus state again          │
│    │     └── compare: was focus stolen?              │
│    ├── logRecord(stealRecord) → JSONL file           │
│    └── store: focusMonitorRecords[]                  │
│                                                     │
│  IPC: get-focus-state (sync)                         │
└──────────────────┬──────────────────────────────────┘
                   │ sync IPC
┌──────────────────▼──────────────────────────────────┐
│ Renderer (AI WebContents, via preload)               │
│                                                     │
│  ai-page-preload.ts                                  │
│    ├── FocusTracker.init()                           │
│    │     ├── document.addEventListener('focusin')   │
│    │     ├── document.addEventListener('focusout')  │
│    │     └── track activeElement state              │
│    └── getFocusState() → FocusState                 │
│                                                     │
│  FocusState: {                                       │
│    hasFocusedElement: boolean,                       │
│    activeElement: { tagName, type, role, selector }, │
│    lastFocusChange: timestamp,                       │
│    reportedAt: timestamp                             │
│  }                                                   │
└─────────────────────────────────────────────────────┘
```

### 4.3 检测流程

```
[用户开始在 ChatGPT 的 textarea 中输入]
  → preload 的 FocusTracker 通过 focusin 事件检测到活动输入
  → FocusState: { hasFocusedElement: true, activeElement: { tagName: 'textarea', ... } }

[另一个 AI 视图完成加载 → did-stop-loading → focusAIViewIfCurrent]
  → FocusMonitor 拦截 focus() 调用
  → Before: 通过 get-focus-state IPC 查询 ChatGPT 的 FocusState
  →        hadActiveInput = true, activeElement = <textarea#prompt-textarea>
  → Execute: view.webContents.focus()
  → After: 再次查询 FocusState
  →        hasFocusedElement = false → "焦点被窃取！" ⚠️
  →        或 hasFocusedElement = true → "焦点未受影响" ✅
  → 记录日志:
    {
      ts: 1234567890,
      source: 'did-stop-loading',
      currentViewId: 'chatgpt-default',
      callingViewId: 'gemini-default',
      isCrossView: true,
      wasCurrentViewFocusedOnEntry: true,
      hadActiveInput: true,
      activeElement: { tagName: 'textarea', selector: '#prompt-textarea' },
      wasFocusStolen: false,  // ← 检测结论
      message: 'focus() called on chatgpt-default, cross-view=false, active input preserved'
    }
```

### 4.4 IPC 接口

```typescript
// IpcSyncRpc 新增通道
'get-focus-state': IpcStructure.IpcRpc<[void], FocusState>;

// FocusState 类型
interface FocusState {
  hasFocusedElement: boolean;
  activeElement: {
    tagName: string;
    type: string | null;
    role: string | null;
    isContentEditable: boolean;
    selector: string;
  } | null;
  lastFocusChange: number;
  reportedAt: number;
}
```

### 4.5 日志输出

```
userData/
  logs/
    focus-monitor-2026-06-20T12-00-00.jsonl
```

每条日志一行 JSON，包含：
- 时间戳、调用源、当前视图 ID、调用视图 ID
- 是否为跨视图调用
- 调用前的焦点状态（是否有活动输入、活动元素信息）
- 调用后的焦点状态
- 是否检测到焦点窃取
- 完整的堆栈跟踪

---

## 5. 实施计划

### Phase 1: 创建产品文档（本期完成）

- 保存本文件作为需求分析文档

### Phase 2: 实现 FocusMonitor Retexel

1. **创建类型定义**：`src/Types/FocusMonitor.d.ts`
2. **创建 Preload 焦点追踪器**：`src/ai-page-preload-focus.ts`
3. **集成到 ai-page-preload.ts**
4. **扩展 IPC Schema**：`IpcSchema.d.ts` 添加 `get-focus-state`
5. **创建 FocusMonitor retexel**：`src/Main/reaxels/Views/AI-Views/focus-monitor.retexel.ts`
6. **仪表化焦点调用点**：`AI-Views/index.ts` 和 `Views/index.ts`

### Phase 3: 运行时验证

- 在开发环境中启动 ChatAIO
- 模拟多种焦点窃取场景
- 分析日志输出
- 根据结果汇报是否确实存在焦点窃取

---

## 6. 质量目标

| 指标 | 目标 |
|------|------|
| 检测准确率 | 能正确区分"焦点被窃取"vs"无影响" |
| 性能开销 | FocusMonitor 禁用时零开销；启用时仅在焦点调用点增加一次 sync IPC 查询 |
| 非侵入性 | 不影响现有视图切换逻辑、焦点管理、用户交互 |
| 日志完整性 | 每次 `webContents.focus()` 调用都有完整记录 |
