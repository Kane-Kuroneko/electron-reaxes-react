# PromptView Product & Architecture

## 结论

PromptView 是 AI-WebApp 主窗口内的本地工具侧栏，用两个 `WebContentsView` 分别承载左侧 `PromptViewLeft` 和右侧 `PromptViewRight`。它不属于某个 AI page，也不加载远程页面；其 prompt 数据按左右侧分别持久化，并可在不同 AI page 之间复用。

MVP 目标是提供稳定的暂存、编辑、复制和排序能力。自动把 prompt 注入各 AI 网站输入框不纳入本阶段，因为不同站点 DOM、快捷键、富文本编辑器和权限边界差异较大，容易引入不稳定行为。

## 用户价值

- 快速复用常用 prompt：用户在侧栏中直接复制某段 prompt，然后粘贴到当前 AI page。
- 暂存和持久化待编辑 prompt：PromptView 的 textarea 内容自动保存，重启后恢复。
- 跨 AI page 使用：PromptView 数据不绑定 `AI.AIItem.id`，切换 ChatGPT/Gemini/Claude 等 AI page 后仍保持。
- 左右双工作区：左侧和右侧分别维护 prompt 列表，方便用户把不同任务流分区。

## UX 行为

- 菜单和快捷键可分别切换左、右 PromptView。
- 左右侧栏展开时，中间区域重新布局，当前中心内容继续显示；常规运行态下中间是当前 AI page。
- 侧栏宽度使用 cubic-bezier easing 逐帧调整，避免瞬间跳变。
- SettingsView 中切换主题或语言时，PromptView 会通过主进程事件同步即时预览；Apply/Save 成功后，主进程再次广播持久化后的最终外观状态。
- 每个 prompt 用 Card 包裹，主体是 textarea，底部是操作区：
  - duplicate：复制当前卡片为新卡片。
  - copy：复制 textarea 内容到系统剪贴板。
  - delete：删除当前卡片。
  - drag to sort：拖动排序把手。
- 空列表显示 add 操作；首次使用默认生成 3 个空 prompt。

## 技术依据

- Electron 官方文档说明 `WebContentsView` 是主进程 View，可通过 `contentView.addChildView()` 添加到窗口并用 `setBounds()` 布局。
- Electron 官方文档已标记 `BrowserView` deprecated，并建议使用 `WebContentsView` 替代。
- AI-WebApp 已经使用 `mainWindow.contentView.addChildView(view)` 和 `WebContentsView.setBounds()` 管理 AI page 与 SettingsView，本功能沿用该模型。

参考：

- https://www.electronjs.org/docs/latest/api/web-contents-view
- https://www.electronjs.org/docs/latest/api/view
- https://www.electronjs.org/docs/latest/api/browser-view

## 架构规划

### Main

新增 `reaxel_PromptViews`：

- 管理 `PromptViewLeft` / `PromptViewRight` 两个 `WebContentsView` 的创建、显示状态、当前宽度、目标宽度和动画。
- 向现有 `Reaxel_View.fitWindow()` 暴露左右 inset，让 AI views / SettingsView 的 bounds 被压缩到中间区域。
- 在 resize、toggle 和动画帧中同步左右侧栏 bounds。
- 动画帧内只更新左右 PromptView 和当前中心 WebContentsView 的 bounds，避免每帧重排所有 AI views。
- 在显示 PromptView 时关闭 SettingsView，使常规中心区域回到当前 AI page。

新增 prompt 数据服务：

- 使用 `electron-store` 持久化：
  - `left: PromptView.Item[]`
  - `right: PromptView.Item[]`
- 通过 IPC 提供：
  - `get-prompt-view-state`
  - `save-prompt-view-items`
  - `copy-prompt-view-text`

### Preload / IPC

继续使用 `src/preload.ts` 暴露本地 view API：

- `api.getPromptViewState(side)`
- `api.savePromptViewItems(side, items)`
- `api.copyPromptViewText(text)`
- `api.previewPromptViewAppearance(appearance)`
- `api.onPromptViewAppearanceChange(callback)`

所有 channel 写入 `src/Types/IpcSchema.d.ts`。Renderer 只调用 `window.api`，不直接导入 Electron IPC。

### Renderer

新增 `src/Views/PromptView`：

- `App.tsx`：页面壳和 antd theme provider。
- `reaxels/prompt-view/index.ts`：加载、编辑、复制、删除、重复、排序和自动保存。
- `index.less`：侧栏专用布局；Card 圆角不超过 8px。
- 使用 `@dnd-kit/sortable` 复用项目已有拖拽排序依赖。

### Webpack

在 `partial.webpack-conf.ts` 新增 renderer entry：

- `PromptView: src/Views/PromptView/index.tsx`
- 输出 `dist/renderer/PromptView/index.html`

## 数据模型

```typescript
export namespace PromptView {
   export type Side = 'left' | 'right';

   export type Item = {
      id: string;
      content: string;
      createdAt: number;
      updatedAt: number;
   };

   export type State = {
      side: Side;
      items: Item[];
      appearance: {
         theme: 'light' | 'dark' | 'system';
         language: Languages | 'follow-system';
      };
      environment: {
         systemLanguage: Languages;
         systemTheme: 'light' | 'dark';
      };
   };
}
```

## 快捷键

- `Alt+,`: Toggle PromptViewLeft
- `Alt+.`: Toggle PromptViewRight

现有 AI 切换快捷键已经使用 `CmdOrCtrl+[` / `CmdOrCtrl+]` 和 `Alt+[` / `Alt+]`，因此 PromptView 使用 comma/period 变体避免覆盖。

## 验证标准

- 左右 PromptView 可通过菜单和快捷键独立展开/收起。
- 展开/收起过程中宽度平滑变化，中间 AI view 跟随重新布局。
- 两侧数据独立持久化，重启或重新打开后保留。
- textarea 编辑会自动保存，duplicate/copy/delete/drag sort 可用。
- Renderer 代码没有直接导入 `ipcRenderer` 或主进程 IPC 工具。
- 新增 TypeScript 文件遵守底部 import 和项目缩进规范。
