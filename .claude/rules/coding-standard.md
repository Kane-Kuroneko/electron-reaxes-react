---
trigger: always_on
description: 编码规范 — 缩进、命名、导入、代码组织等通用编码标准
---

# 编码规范

> 混合自 `CODING_STANDARD.md`（最新，2026-06-11）和 `.qoder/rules/coding-standard.md`（2026-06-11），以内容完整性和合理性为准。

---

## Import 规范

**强制规则：所有 import/export 语句必须置于文件底部，而非顶部！**

从文件底部向上，按以下顺序排列：
1. **相对路径** — `./components/*`, `../utils/*`, `./index.d.ts`
2. **项目别名路径** — `#main/*`, `#generics/*`, `#project/*`, `#root/*`, `#src/*`
3. **第三方库** — `electron`, `lodash`, `react`, `antd`, `reaxes-react` 等
4. **样式文件** — `./index.less`, `./index.css`（最底部）

```typescript
// ✅ 正确示例
const cssLoaderOptions = {
    sourceMap: true,
    modules: { ... }
};

export const webpackBaseConf: Configuration = { ... };

// import 语句统一放在文件底部
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";  // 别名路径
import { Button, Form, Menu } from 'antd';          // 第三方库
import { reaxper } from 'reaxes-react';             // 第三方库
import './index.less';                              // 最底部：样式文件
```

```typescript
// ❌ 错误示例 - import 在顶部
import { app, BrowserWindow } from "electron";
import { reaxper } from 'reaxes-react';

const win = new BrowserWindow({ ... });
```

### 导出语句组织

工具类文件中，无依赖的导出放上面：
```typescript
// 无依赖的导出放上面
export * from './dayjs.utility';
export * from './isPromise.utility';
export * from './debounce.utility';

// 有依赖的导出在业务逻辑之后
export const debounce = <F extends any[], T>(callback: T, wait: number) => { ... };
```

---

## 缩进规范

**优先使用 Tab 缩进，或使用 3 个空格。禁止 2 空格或 4 空格缩进。**

`.editorconfig` 配置：
```ini
indent_style = tab
indent_size = 3
tab_width = 3
```

```typescript
// ✅ 正确 - Tab 缩进
function fetchData() {
	const data = await api.getData();
	return data;
}

// ✅ 正确 - 3 空格缩进
function processData() {
   const result = transform(data);
   return result;
}

// ❌ 禁止 2 空格
function bad() {
  const x = 1;  // 2 空格
}

// ❌ 禁止 4 空格
function bad2() {
    const x = 1;  // 4 空格
}
```

尾随空格不强制要求删除（`trim_trailing_whitespace = false`）。

---

## 命名规范

### Reaxel 模块
- **目录名**：kebab-case（如 `ui-scale/`, `runtime-paths/`, `storage/`）
- **实例名**：`reaxel_` 前缀 + PascalCase（如 `reaxel_HotkeyEnhancer`, `reaxel_CheatCodes`）
- **多例工厂**：`Refaxel_` 前缀 + PascalCase（如 `Refaxel_Counter`）
- **增强器**：`rehance_` 前缀 + 功能名（如 `rehance_BrowserPersist`）

### 变量和函数
- 变量/函数：**camelCase**（如 `fetchUserData`, `toggleMainSwitch`）
- 常量：**UPPER_SNAKE_CASE**（如 `MAX_RETRY_COUNT`）
- 类/接口：**PascalCase**（如 `UserService`, `IUserData`）
- 类型别名：**PascalCase**（如 `Layouts`, `IpcStructure`）

### 组件
- React 组件：**PascalCase**（如 `MainSwitch`, `HotkeyEnhancer`）
- 可选 `RC` 前缀（如 `RCAppearancePanel`）

### 工具函数文件
- 使用 `.utility.ts` 后缀（如 `debounce.utility.ts`, `clone-for-ipc.utility.ts`）

---

## 代码组织模式

### Reaxel 模块模板
```typescript
export const reaxel_ModuleName = reaxel(() => {
    // 1. 创建响应式状态
    const { store, setState, mutate } = createReaxable({
        // 状态定义
    });

    // 2. 观察反应（可选）
    obsReaction(() => {
        // 副作用
    }, () => [/* 依赖 */]);

    // 3. 业务逻辑函数
    const someFunction = async () => {
        // 业务逻辑
    };

    // 4. rtn 只包含业务方法
    const rtn = {
        someFunction,
    };

    // 5. 使用 Object.assign 挂载 store/setState/mutate
    return Object.assign(() => rtn, {
        store,
        setState,
        mutate,
    });
});

// import 放在底部
import { createReaxable, obsReaction } from 'reaxes';
```

### React 组件模板
```typescript
const { Item } = Form;  // 解构外部组件

export const ComponentName = reaxper(() => {
    // 1. 获取 store 和 setState
    const store = reaxel_ModuleName.store.xxx;
    const setState = reaxel_ModuleName.setState.xxx;

    // 2. 获取业务方法
    const { method1, method2 } = reaxel_ModuleName();

    // 3. 副作用
    useEffect(() => {
        ~async function () {
            // 初始化逻辑
        }();
    }, []);

    // 4. 渲染 JSX
    return <div>...</div>;
});

// import 放在底部
import { Button, Form, Menu } from 'antd';
import { reaxper } from 'reaxes-react';
import './index.less';
```

**注意**：React hooks（`useState`, `useEffect`, `useRef`, `useMemo` 等）通过 webpack ProvidePlugin 全局注入，**无需显式 import**。

### 通用工具归位
- 如果函数或工具可能被广泛复用且业务无关，放入对应宿主环境的 `utils/` 或 `toolkits/` 目录
- 工具文件使用 `.utility.ts` 命名
- 不要在业务模块内保留可复用的通用工具

---

## 格式细节

| 规则 | 说明 |
|------|------|
| **分号** | 语句末尾使用分号 |
| **引号** | 优先单引号，特殊场景用双引号 |
| **参数空格** | 函数参数前后加空格：`obsReaction(() => { ... }, () => [store.mainWindow])` |
| **立即执行** | 使用 `~` 或 `()` 包裹：`~async function () { ... }()` |

---

## 注释规范

### JSDoc
工具函数使用 JSDoc 格式：
```typescript
/**
 * @description 功能描述
 * @param {type} paramName 参数说明
 * @return {type} 返回值说明
 */
export const functionName = <T>(param: T): ReturnType => {
    // 实现逻辑
};
```

### 行内注释
使用中文注释，简洁明了：
```typescript
// 除了 macOS 外，当所有窗口都被关闭的时候退出程序
// app.on('window-all-closed', () => {
//     if(process.platform !== 'darwin') app.quit();
// });
```

### 调试代码
允许保留调试代码（注释状态或带条件）：
```typescript
// console.log('HDR support:', hdrSupported);
//@ts-expect-error
window.core_store = store;
//debugger
```

---

## TypeScript 规范

- **宽松模式**：项目使用 `strict: false`，允许一定类型灵活性
- **必要时使用** `@ts-ignore` 或 `@ts-expect-error`
- **工具函数广泛使用泛型**：
  ```typescript
  export const debounce = <F extends any[], T extends ((...args: F) => any)>(
      callback: T, wait: number = 1000, immediate: boolean = false
  ): T => { ... };
  ```
- **类型断言**：`return object as Pick<O, ArrayElement<K>>;`

---

## 路径别名

在 `tsconfig.json` 和 webpack 配置中统一定义：

| 别名 | 解析路径 |
|------|----------|
| `#root/*` | `./*` |
| `#root-projects/*` | `./projects/*` |
| `#project/*` | 当前项目 `src/*` |
| `#generics/*` | `./generic-services/*` |
| `#main/*` | 当前项目 `src/Main/*` |
| `#src/*` | 当前项目 `src/*` |

```typescript
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { useBeautifulDevtool } from '#generics/modify-electron/beautiful-devtool';
import { reaxel_MainWindowHub } from '#main/reaxels/main-window-hub';
```

---

## 错误处理

```typescript
// Try-catch 模式
try {
    return JSON.parse(window.localStorage.getItem(key));
} catch(e) {
    return window.localStorage.getItem(key) as ret;
}

// 错误抛出
if(!meta.channel) { throw new Error('channel is required') };
if(registered) { throw new Error('channel already registered'); }
throw `cannot find key '${key}' in storage`;
```

---

## 特殊约定

- **保留未使用代码**：暂时不用的代码注释保留而非删除
- **平台特定代码**：用条件判断区分平台行为
- **避免无关清理**：许多文件有既存的松散类型和注释掉的调试代码，只在任务需要时修改

### ChatAIO Windows FloatingView 鼠标穿透

- 禁止将 FloatingView 改为 `setIgnoreMouseEvents(true, { forward: true })`。
- Windows 上 Electron mouse forwarding 会与其它 BrowserWindow 的系统拖动冲突，导致 Web menubar 抖动、闪烁和粘滞；FloatingView 即使 hidden 也可能触发。
- 当前必须保留 `{ forward: false }`。若未来确需转发 `mousemove`，应在窗口移动/缩放期间关闭 forwarding，并完整回归。
- 修改 FloatingView、menubar drag region、透明窗口或鼠标穿透前，必须阅读 [`menubar-drag-investigation.md`](../../projects/ChatAIO/docs/issues/menubar-drag-investigation.md)。

---

## 代码审查检查清单

- [ ] Import 是否放在文件底部？
- [ ] Import 排序是否正确？（别名路径 → 第三方库 → 样式）
- [ ] 是否使用 Tab 或 3 空格缩进？
- [ ] 命名是否符合规范？（camelCase / PascalCase / kebab-case / `reaxel_`）
- [ ] Reaxel 模块目录名是否使用 kebab-case？
- [ ] 组件是否使用 `reaxper` 包裹？
- [ ] 通用工具是否放在 `utils/`/`toolkits/` 而非业务模块？
- [ ] 工具文件是否使用 `.utility.ts` 后缀？
- [ ] 是否优先使用路径别名（`#` 开头）？
- [ ] 分号/引号风格是否一致？
- [ ] ChatAIO FloatingView 是否保持 `forward: false`，并检查了 Windows 拖拽回归文档？
