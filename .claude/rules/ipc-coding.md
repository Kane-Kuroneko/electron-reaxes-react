---
trigger: model_decision
description: Electron IPC 编码规范 — 渲染进程、主进程、Preload 脚本和类型定义
---

# IPC 编码规范

> 来源：`.qoder/rules/ipc-coding.md`（2026-06-06），适配 Claude Code 格式。
> 架构参考：`src/Main/services/ipc/index.ts`, `src/preload.ts`, `src/Types/IpcSchema.d.ts`

---

## 渲染进程 (Renderer) 规范

### 正确做法
渲染进程必须通过 `window.api` 调用 preload 脚本暴露的 API：

```typescript
// 1. RPC 调用（自动返回 Promise）
const settings = await window.api.fetchSettings();
const result = await window.api.submitSettings(path, data);

// 2. 发送 Renderer → Main 事件
window.api.exitSettings();
window.api.updatePreloadAIConfig(preloadAIFamilies);

// 3. 在 React 组件中使用
const handleSave = () => {
    window.api.updatePreloadAIConfig(preloadAIFamilies);
};
```

### 错误做法
**严禁在渲染进程中直接导入或使用 `createIpc`、`ipcRenderer`！**

```typescript
// ❌ 禁止在渲染进程中导入 createIpc
import { createIpc } from '#generics/toolkit/electron/preload.ipc';
const useRtm = createIpc<RendererToMainEvents>('rtmEvent');
const api = { updatePreloadAIConfig: useRtm('update-preload-ai-config') };

// ❌ 禁止直接使用 ipcRenderer
import { ipcRenderer } from 'electron';
ipcRenderer.send('update-preload-ai-config', data);
ipcRenderer.invoke('fetch-settings');
```

---

## 主进程 (Main) 规范

### 正确做法
主进程必须使用项目封装的 IPC 工具，统一管理事件注册和分发：

```typescript
import { useIpcRpc, useIpcRendererToMain, useIpcMainToRenderer } from '#src/Main/services/ipc';

// RPC（双向，handle/response 模式）
useIpcRpc('fetch-settings').handle(async ({ event }) => {
    return await getSettings();
});

// Renderer → Main 事件
useIpcRendererToMain('update-preload-ai-config').on(({ event }, data) => {
    handleAIConfigUpdate(data);
});

// Main → Renderer 事件
useIpcMainToRenderer('settings-changed').send(webContents, newSettings);
```

### 错误做法
**严禁在主进程中直接使用 `ipcMain.on`、`ipcMain.handle` 或 `webContents.send`！**

```typescript
// ❌ 错误
ipcMain.on('update-preload-ai-config', (event, data) => {});

// ✅ 正确
useIpcRendererToMain('update-preload-ai-config').on(({event}, data) => {});
```

---

## 新增 IPC 通道的完整流程

每个新的 IPC 通道必须完成以下步骤：

### 1. 在 `IpcSchema.d.ts` 中定义类型

```typescript
// src/Types/IpcSchema.d.ts
export interface RendererToMainEvents extends Record<string, IpcStructure.RendererToMainEvent<unknown[], {channel:unknown,args:unknown[]}>> {
    'exit-settings': IpcStructure.RendererToMainEvent<[void], {channel:void,args:void[]}>;
    'update-preload-ai-config': IpcStructure.RendererToMainEvent<[string[]], {channel:void,args:void[]}>;
}

export interface IpcRpc extends Record<string, IpcStructure.IpcRpc<unknown[], unknown>> {
    'fetch-settings': IpcStructure.IpcRpc<[void], Settings>;
    'submit-settings': IpcStructure.IpcRpc<[PatchPath<Settings>, PatchData<Data>], {success: boolean}>;
}
```

### 2. 在 `src/preload.ts` 中暴露 API

```typescript
import { createIpc } from '#generics/toolkit/electron/preload.ipc';

const useRtm = createIpc<RendererToMainEvents>('rtmEvent');
const useRpc = createIpc<IpcRpc>('rpcEvent');

const api = {
    // Event 类型：渲染进程 → 主进程（单向）
    exitSettings: useRtm('exit-settings'),
    updatePreloadAIConfig: useRtm('update-preload-ai-config'),
    // RPC 类型：渲染进程 ↔ 主进程（双向，自动返回 Promise）
    fetchSettings: useRpc('fetch-settings'),
    submitSettings: useRpc('submit-settings'),
};

contextBridge.exposeInMainWorld('api', api);
```

### 3. 如需 Settings UI 使用，在 Settings 服务中封装

---

## IPC 数据传输：克隆 Observable

Electron IPC 使用结构化克隆传输参数。Reaxes/MobX 的 observable、Proxy、class 实例、函数等都会触发 `An object could not be cloned.` 错误。

**规则**：凡参数来自 `reaxel_*.store` 或经 `setState` 写入后的结构，Renderer → Main（以及主进程转发子窗口前）**必须先 `cloneForIPC`**。主进程首次下发的 plain JSON **不等于** store 里仍是 plain——进入 store 后即变为 observable。

```typescript
// ❌ 错误：store 里的对象可能是 observable/proxy，不能直接跨 IPC
api.testProxyServer(reaxel_SettingsView.store.UIControls.networks.proxy_fields, url);

// ✅ 正确：跨 IPC 前先转成 plain data
import { cloneForIPC } from '#src/shared/utils/clone-for-ipc.utility';
const payload = cloneForIPC(reaxel_SettingsView.store.UIControls.networks.proxy_fields);
api.testProxyServer(payload, url);
```

### Store 往返（menubar 等）

```
Main plain JSON  →  IPC  →  reaxel store (observable)  →  api.xxx(...)  →  必须 cloneForIPC
```

ChatAIO menubar 示例：

```typescript
api.openDropdownView({ items: cloneForIPC(topItem.submenu), anchorRect, menuIndex });
api.menuViewAction(cloneForIPC(action));
```

`cloneForIPC` 位于 `#src/shared/utils/clone-for-ipc.utility.ts`。SettingsView / PromptView 已有正确用法，新 IPC 路径应对齐同一模式。

---

## 架构总览

```
┌─────────────────────────────────────┐
│  Renderer 进程 (React UI)           │
│  window.api.updatePreloadAIConfig() │  ← 使用 preload 暴露的 API
└──────────────┬──────────────────────┘
               │ contextBridge
┌──────────────▼──────────────────────┐
│  Preload 脚本                       │
│  contextBridge.exposeInMainWorld    │  ← 安全桥接
│  ('api', { updatePreloadAIConfig }) │
└──────────────┬──────────────────────┘
               │ IPC 通信
┌──────────────▼──────────────────────┐
│  Main 进程                          │
│  useIpcRendererToMain().on()        │  ← 使用封装工具监听
└─────────────────────────────────────┘
```

**核心原则**：
- 渲染进程只能通过 preload 暴露的 `window.api` 与主进程通信
- 主进程必须使用封装的 IPC 工具，统一管理事件注册和分发
- 所有 IPC 通道必须有明确的类型定义
- 跨 IPC 前必须将 Observable 转为 plain data

---

## 代码审查检查清单

- [ ] **跨 IPC 参数是否已 `cloneForIPC`？**（含 store 往返、menubar `openDropdownView` / `menuViewAction` — **最高优先级**）
- [ ] 主进程是否使用了 `useIpcRpc` / `useIpcRendererToMain` / `useIpcMainToRenderer`？
- [ ] 主进程是否**没有**直接使用 `ipcMain.on` / `ipcMain.handle` / `webContents.send`？
- [ ] 渲染进程是否使用了 `window.api.xxx`？
- [ ] 渲染进程是否**没有**导入 `createIpc` 或 `ipcRenderer`？
- [ ] 新增的 IPC 通道是否已在 `IpcSchema.d.ts` 中定义类型？
- [ ] 跨 IPC 传递 store 数据前是否使用了 `cloneForIPC`？（与第一条等价，保留便于检索）

> ChatAIO FloatingView/menubar/窗口鼠标穿透改动还必须阅读 [`menubar-drag-investigation.md`](../../projects/ChatAIO/docs/issues/menubar-drag-investigation.md)；Windows 上禁止启用 `setIgnoreMouseEvents(..., { forward: true })`。
