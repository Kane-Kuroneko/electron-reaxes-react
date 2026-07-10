---
trigger: model_decision
description: 编写ipc相关代码时应用
---

## 📌 渲染进程 (Renderer Thread) 规范

### ✅ 正确做法

渲染进程必须通过 `window.api` 调用 preload 脚本暴露的 API。

```typescript
// 1. 调用 RPC (自动返回 Promise)
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

### ❌ 错误做法

**严禁在渲染进程中直接导入或使用 createIpc!**

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

### 📋 API 说明

位于 `src/preload.ts`,通过 `contextBridge.exposeInMainWorld('api', api)` 暴露:

| API 方法                               | 类型    | 说明      |
|--------------------------------------|-------|---------|
| `window.api.fetchSettings()`         | RPC   | 获取设置    |
| `window.api.submitSettings()`        | RPC   | 提交设置    |
| `window.api.exitSettings()`          | Event | 退出设置页面  |
| `window.api.updatePreloadAIConfig()` | Event | 更新预加载配置 |

---

## 🔧 类型定义

所有 IPC 通道类型必须在 `src/Types/IpcSchema.d.ts` 中定义:

```typescript
export interface RendererToMainEvents extends Record<string, IpcStructure.RendererToMainEvent<unknown[], {channel:unknown,args:unknown[]}>> {
  'exit-settings': IpcStructure.RendererToMainEvent<[void], {channel:void,args:void[]}>;
  'update-preload-ai-config': IpcStructure.RendererToMainEvent<[string[]], {channel:void,args:void[]}>;
}

export interface IpcRpc extends Record<string, IpcStructure.IpcRpc<unknown[], unknown>> {
  'fetch-settings': IpcStructure.IpcRpc<[void], Settings>;
  'submit-settings': IpcStructure.IpcRpc<[PatchPath<Settings>, PatchData<Data>], {success: boolean}>;
}
```

---

## 📝 代码审查检查清单

在 Code Review 时,请检查:

- [ ] 主进程是否使用了 `useIpcRpc`/`useIpcRendererToMain`/`useIpcMainToRenderer`
- [ ] 主进程是否应该**没有**直接使用 `ipcMain.on`/`ipcMain.handle`/`webContents.send`
- [ ] 渲染进程是否使用了 `window.api.xxx`
- [ ] 渲染进程是否应该**没有**导入 `createIpc` 或 `ipcRenderer`
- [ ] 新增的 IPC 通道是否已在 `IpcSchema.d.ts` 中定义类型

---

## 🎯 参考文件

- **主进程 IPC 封装**: `src/Main/services/ipc/index.ts`
- **Preload 脚本**: `src/preload.ts`
- **IPC 类型定义**: `src/Types/IpcSchema.d.ts`
- **工具源码**: `#generics/toolkit/electron/ipc.main.ts`
- **使用示例**: `src/Main/reaxels/Views/index.ts` (第73行)

---

## ⚠️ 常见错误

### 错误 0: 把 Reaxes/MobX observable 或复杂对象直接传给 IPC

Electron IPC 使用结构化克隆传输参数。Reaxes/MobX 的 observable、Proxy、class 实例、函数、DOM/Event、含循环引用的对象等都可能触发 `An object could not be cloned.`。

```typescript
// ❌ 错误：store 里的对象可能是 observable/proxy，不能直接跨 IPC
api.testProxyServer(reaxel_SettingsView.store.UIControls.networks.proxy_fields, url);

// ✅ 正确：跨 IPC 前先转成 plain data
const payload = cloneForIPC(reaxel_SettingsView.store.UIControls.networks.proxy_fields);
api.testProxyServer(payload, url);
```

新增或修改 IPC 调用时必须检查参数是否为可结构化克隆的 plain data；SettingsView 中来自 `reaxel_SettingsView.store` 的对象尤其要先通过 `#src/shared/utils/clone-for-ipc.utility` 的 `cloneForIPC` 转换。该工具内部使用 MobX 官方 `toJS` 展开 observable，并处理普通对象中嵌套 observable 的情况。

### 错误 1: 主进程直接使用 ipcMain

```typescript
// ❌ 错误
ipcMain.on('update-preload-ai-config', (event, data) => {});

// ✅ 正确
useIpcRendererToMain('update-preload-ai-config').on(({event}, data) => {});
```

### 错误 2: 渲染进程导入 createIpc
```typescript
// ❌ 错误
import { createIpc } from '#generics/toolkit/electron/preload.ipc';
const api = { update: useRtm('update-preload-ai-config') };
api.update(data);
```

**✅ 正确完整用例：必须先在 `preload.ts` 中创建并暴露 API，渲染进程才能通过 `window.api` 调用**

**步骤 1: 在 `src/preload.ts` 中创建 API**

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

**步骤 2: 在渲染进程 (React) 中使用 `window.api`**

```typescript
const settings = await window.api.fetchSettings();
window.api.updatePreloadAIConfig(preloadAIFamilies);
```

### 错误 3: 在渲染进程使用 ipcRenderer

```typescript
// ❌ 错误
import { ipcRenderer } from 'electron';
ipcRenderer.send('exit-settings');

// ✅ 正确
window.api.exitSettings();
```

---

## 📚 架构说明

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
               │ IPC 通信 (JSON 通道)
┌──────────────▼──────────────────────┐
│  Main 进程                          │
│  useIpcRendererToMain().on()       │  ← 使用封装工具监听
└─────────────────────────────────────┘
```

**核心原则**: 
- 🔒 渲染进程只能通过 preload 暴露的 API 与主进程通信
- 🛠️ 主进程必须使用项目封装的 IPC 工具,统一管理事件注册和分发
- 📝 所有 IPC 通道必须有明确的类型定义

> ChatAIO FloatingView/menubar/窗口鼠标穿透改动还必须阅读 [`menubar-drag-investigation.md`](../../projects/ChatAIO/docs/issues/menubar-drag-investigation.md)；Windows 上禁止启用 `setIgnoreMouseEvents(..., { forward: true })`。
