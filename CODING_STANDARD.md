# 📝 项目编码规范文档

> 本规范基于项目现有代码风格沉淀，每次coding时必须自动遵守 ✨

---

## 1️⃣ 文件结构规范 📁

### 1.1 ESM Import/Export 位置
**🔴 强制规则：所有 import/export 语句必须置于文件底部，而非顶部！**

```typescript
// ✅ 正确示例
const cssLoaderOptions = {
	sourceMap: true,
	modules: { ... }
};

export const webpackBaseConf:Configuration = { ... };

// import 语句统一放在文件底部
import WebpackLoader from './webpack-loader';
import { absolutelyPath_RepositoryRoot } from '../toolkit';
import babelConf from '../babel/conf';
import _ from 'lodash';
import path from 'path';
import webpack, {Configuration} from 'webpack';
```

```typescript
// ❌ 错误示例 - import 在顶部
import { app, BrowserWindow } from "electron";
const win = new BrowserWindow({ ... });
```

### 1.2 Import 排序规则（按重要性降序）
**从文件底部向上，按以下顺序排列：**

3. **相对路径** - 如 `./components/*`, `../utils/*`
2. **项目内部别名路径** - 如 `#main/*`, `#generics/*`, `#project/*`, `#root/*`
1. **第三方库** - 如 `electron`, `lodash`, `react`, `antd` 等
4. **样式文件** - 如 `./index.less`, `./index.css`

```typescript
// 文件底部的 import 顺序示例
import { reaxel_SettingsView } from "#src/...";    // 相对/别名路径
import { Button, Form, Menu } from 'antd';          // 第三方库
import { reaxper } from 'reaxes-react';             // 第三方库
import './index.less';                              // 最底部：样式文件
```

### 1.3 导出语句组织
**在工具类文件中，导出语句放在业务逻辑之后：**

```typescript
// 业务逻辑代码
export const debounce = <F extends any[], T>(callback: T, wait: number) => { ... };

// 无依赖的导出放上面（如有注释标注）
/*无依赖@@utils的放上面*/
export * from './dayjs.utility';
export * from './isPromise.utility';
export * from './debounce.utility';
```

---

## 2️⃣ 命名规范 🏷️

### 2.1 变量命名
- **reaxel 实例**：使用 `reaxel_` 前缀 + 帕斯卡命名
  ```typescript
  const reaxel_MainWindowHub = reaxel(() => { ... });
  const reaxel_storage = reaxel(() => { ... });
  ```

- **Store/State 命名**：
  ```typescript
  const { store, setState, mutate } = createReaxable({ ... });
  // 或
  const { store, setState, mutate } = orzMobx({ ... });
  ```

- **返回值对象**：使用有意义的名称
  ```typescript
  let rtn = {
  	Core_Store: store,
  	Core_SetState: setState,
  	Core_Mutate: mutate,
  };
  ```

### 2.2 组件命名
- **React 组件**：使用帕斯卡命名，导出时加 `RC` 前缀（可选）
  ```typescript
  export const App = reaxper(() => { ... });
  export const RCAppearancePanel = () => { ... };
  ```

### 2.3 工具函数命名
- **工具函数文件**：使用 `.utility.ts` 后缀
  ```typescript
  debounce.utility.ts
  isPromise.utility.ts
  stringify.utility.ts
  ```

### 2.4 类型命名
- **Type/Interface**：使用帕斯卡命名
  ```typescript
  type Layouts = Single | SplitInHorizontal | SplitInVertical;
  interface IpcStructure { ... }
  ```

---

## 3️⃣ 代码组织模式 🏗️

### 3.1 Reaxel 状态管理模块结构
```typescript
export const reaxel_ModuleName = reaxel(() => {
	// 1. 创建响应式状态
	const { store, setState, mutate } = createReaxable({
		mainWindow: null as BrowserWindow,
	});
	
	// 2. 观察反应（可选）
	obsReaction(() => {
		if(store.mainWindow){
			useBeautifulDevtool(store.mainWindow);
		}
	}, () => [store.mainWindow]);
	
	// 3. 业务逻辑函数
	const createMainWindow = async (options) => {
		// ...
	};
	createMainWindow();
	
	// 4. 返回接口
	const rtn = {
		get mainWindow(){
			return store.mainWindow;
		},
	};
	
	return Object.assign(() => rtn, {
		store,
		setState,
		mutate,
	});
});

// import 语句放在文件底部
import { app, BrowserWindow } from 'electron';
```

### 3.2 React 组件结构
```typescript
const { Item } = Form;  // 解构外部组件

export const App = reaxper(() => {
	// 1. 获取 store 和 setState
	const store = reaxel_SettingsView.store.RootMenu;
	const setState = reaxel_SettingsView.setState.RootMenu;
	
	// 2. 获取方法
	const { submitSettings, fetchSettings, exitSettings } = reaxel_SettingsView();
	
	// 3. 计算属性/映射
	const MenuContentComponent = {
		net: RCNetworkPanel,
		appearance: RCAppearancePanel,
	}[store.current];
	
	// 4. 副作用
	useEffect(() => {
		~async function () {
			const settings = await fetchSettings();
		}();
	}, []);
	
	// 5. 渲染 JSX
	return <div>...</div>;
});

// import 放在底部
import { Button, Form, Menu } from 'antd';
import { reaxper } from 'reaxes-react';
import './index.less';
```

### 3.3 工具函数结构
```typescript
/**
 * @description 功能描述
 * @param {type} paramName 参数说明
 * @return {type} 返回值说明
 */
export const functionName = <T>(param: T): ReturnType => {
	// 实现逻辑
};

// 无额外 import 或 import 在底部
```

### 3.4 通用工具归位

- 如果函数或工具可能被广泛复用、业务无关，应根据宿主环境放入相应目录的 `utils` 或 `toolkits` 中，而不是散落在业务模块内。
- 工具函数文件使用 `.utility.ts` 后缀；例如 ChatAIO 里的 IPC/observable plain clone 放在 `src/shared/utils/clone-for-ipc.utility.ts`。

---

## 4️⃣ 注释规范 📝

### 4.1 JSDoc 注释
**工具函数使用 JSDoc 格式：**
```typescript
/**
 * @description 防抖功能
 * @param {function} fn 要进行防抖处理的function
 * @param {number} wait  间隔时间 ms为单位
 * @param {boolean} immediate  开启后在最初的一次会立即执行
 * @return {function} 进行防抖处理后的函数
 */
export const debounce = (callback, wait = 1000, immediate = false) => { ... };
```

### 4.2 行内注释
**使用中文注释，简洁明了：**
```typescript
// 除了 macOS 外，当所有窗口都被关闭的时候退出程序
// app.on('window-all-closed', () => {
// 	if(process.platform !== 'darwin') app.quit();
// });

// 以下逻辑先假设用户将spore放置在上半边. 下半边的逻辑由useRevert劫持处理.
const useRevert = dropPosition === 'bottom';

// 原本的布局就是水平的,直接将另一边原本的还原
case prevLayout instanceof SplitInHorizontal: { ... }
```

### 4.3 调试注释
**保留调试代码的注释形式：**
```typescript
//@ts-expect-error
window.core_store = store;
//debugger
```

---

## 5️⃣ TypeScript 规范 🔷

### 5.1 类型声明
- **宽松模式**：项目使用 `strict: false`，允许一定的类型灵活性
- **必要时使用 `@ts-ignore` 或 `@ts-expect-error`**：
  ```typescript
  /*@ts-ignore*/
  if(!keys.includes(k)) {
  	delete object[k];
  }
  ```

### 5.2 泛型使用
**工具函数广泛使用泛型：**
```typescript
export const debounce = <F extends any[], T extends ((...args: F) => any)>(
	callback: T,
	wait: number = 1000,
	immediate: boolean = false
): T => { ... };

export const isPromise = <T = any>(target: any): target is Promise<T> => { ... };
```

### 5.3 类型断言
```typescript
return object as Pick<O, ArrayElement<K>>;
return window.localStorage.getItem(key) as ret;
```

---

## 6️⃣ 路径别名规范 🛤️

### 6.1 别名定义
**在 tsconfig.json 和 webpack 配置中统一定义：**
```json
{
  "paths": {
    "#root/*": ["./*"],
    "#root-projects/*": ["./projects/*"],
    "#project/*": ["./当前项目src/*"],
    "#generics/*": ["./generic-services/*"],
    "#main/*": ["./当前项目src/Main/*"],
    "#src/*": ["./当前项目src/*"]
  }
}
```

### 6.2 使用示例
```typescript
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { useBeautifulDevtool } from '#generics/modify-electron/beautiful-devtool';
import { reaxel_MainWindowHub } from '#main/reaxels/main-window-hub';
```

---

## 7️⃣ 错误处理规范 ⚠️

### 7.1 Try-Catch 模式
```typescript
try {
	return JSON.parse(window.localStorage.getItem(key));
} catch(e) {
	return window.localStorage.getItem(key) as ret;
}
```

### 7.2 调试器使用
**错误处理中使用 `debugger` 辅助调试：**
```typescript
try {
	target.send('JSON', { channel }, ...args);
} catch(e) {
	debugger;
	throw e;
}
```

### 7.3 错误抛出
```typescript
if(!meta.channel) { throw new Error('channel is required') };
if(registered) { throw new Error('channel already registered'); }
throw `cannot find key '${key}' in storage`;
```

---

## 8️⃣ 代码风格细节 🎨

### 8.1 空格与缩进
- **Tab 缩进**：使用 Tab 而非空格
- **函数参数空格**：参数前后加空格
  ```typescript
  app.whenReady().then(() => { ... });
  obsReaction(() => { ... }, () => [store.mainWindow]);
  ```

### 8.2 分号使用
**语句末尾使用分号：**
```typescript
const win = new BrowserWindow({ ... });
win.loadURL("https://localhost:3111");
```

### 8.3 字符串引号
**优先使用单引号，特殊场景使用双引号：**
```typescript
import logger from 'electron-log/main';
const title = 'AI-WebTools-AIO';
```

### 8.4 立即执行函数
**使用 `~` 或 `()` 包裹：**
```typescript
useEffect(() => {
	~async function () {
		const settings = await fetchSettings();
	}();
}, []);
```

---

## 9️⃣ React & Hooks 规范 ⚛️

### 9.1 使用 reaxper 包裹组件
```typescript
export const App = reaxper(() => {
	// 组件逻辑
	return <div>...</div>;
});
```

### 9.2 Hooks 使用
**使用全局 ProvidePlugin 注入的 Hooks，无需显式 import：**
```typescript
// 无需 import { useState, useEffect } from 'react'
// 直接使用：
const [state, setState] = useState(initialValue);
useEffect(() => { ... }, []);
```

### 9.3 组件解构
```typescript
const { Item } = Form;
const { submitSettings, fetchSettings } = reaxel_SettingsView();
```

---

## 🔟 特殊约定 🔖

### 10.1 调试代码保留
**允许保留调试代码（注释状态或带条件）：**
```typescript
// console.log('HDR support:', hdrSupported);
//@ts-expect-error
window.core_store = store;
//debugger
```

### 10.2 未使用代码处理
**暂时不用的代码注释保留，而非删除：**
```typescript
// if(false){
// 	Promise.all([chatGPTView,grokView]).then(([chatGPT, grok]) => {
// 		...
// 	});
// }
```

### 10.3 平台特定代码
```typescript
// 除了 macOS 外，当所有窗口都被关闭的时候退出程序
// app.on('window-all-closed', () => {
// 	if(process.platform !== 'darwin') app.quit();
// });
```

### 10.4 ChatAIO Windows FloatingView 鼠标穿透

- 禁止将 FloatingView 改为 `setIgnoreMouseEvents(true, { forward: true })`。
- Windows 上 Electron mouse forwarding 会干扰其它 BrowserWindow 的系统拖动，造成 Web menubar 抖动、闪烁和粘滞；FloatingView 即使 hidden 也可能触发。
- 当前必须保留 `{ forward: false }`。若未来确需转发 `mousemove`，应在窗口移动/缩放期间关闭 forwarding，并完整回归。
- 修改 FloatingView、menubar drag region、透明窗口或鼠标穿透前，必须阅读 [`projects/ChatAIO/docs/issues/menubar-drag-investigation.md`](projects/ChatAIO/docs/issues/menubar-drag-investigation.md)。

---

## 1️⃣1️⃣ 文件命名规范 📄

### 11.1 目录结构
```
reaxels/
  ├── module-name/
  │   └── index.ts(x)     # reaxel 状态管理模块
  │
views/
  ├── ViewName/
  │   ├── index.tsx       # 视图入口
  │   ├── App.tsx         # 主组件
  │   └── components/     # 子组件
  │
utils/
  ├── xxx.utility.ts      # 工具函数
  └── index.ts            # 统一导出
```

### 11.2 入口文件
- **主进程**：`main.ts` 或 `index.tsx`
- **渲染进程**：`index.tsx` 或 `App.tsx`
- **模块入口**：统一使用 `index.ts(x)`

---

## 📌 总结检查清单 ✅

每次编写代码时，自动检查以下项：

- [ ] **Import 是否放在文件底部？**
- [ ] **Import 是否按重要性排序？（第三方库 → 别名路径 → 相对路径 → 样式）**
- [ ] **reaxel 实例是否使用 `reaxel_` 前缀？**
- [ ] **工具函数文件是否使用 `.utility.ts` 后缀？**
- [ ] **通用、业务无关的工具是否放在对应 `utils`/`toolkits` 目录？**
- [ ] **注释是否使用中文？**
- [ ] **是否使用 Tab 缩进？**
- [ ] **是否使用分号结尾？**
- [ ] **是否优先使用路径别名（`#` 开头）？**
- [ ] **组件是否使用 `reaxper` 包裹？**
- [ ] **错误处理是否包含 `debugger`（可选）？**
- [ ] **ChatAIO FloatingView 是否保持 `forward: false`，并检查了 Windows 拖拽回归文档？**

---

## 🚀 附录：常用模式速查

### Reaxel 模块模板
```typescript
export const reaxel_ModuleName = reaxel(() => {
	const { store, setState, mutate } = createReaxable({
		// 状态定义
	});
	
	obsReaction(() => {
		// 副作用
	}, () => [/* 依赖 */]);
	
	const someFunction = async () => {
		// 业务逻辑
	};
	
	const rtn = {
		// 公开接口
	};
	
	return Object.assign(() => rtn, {
		store,
		setState,
		mutate,
	});
});

import { ... } from '...';
```

### React 组件模板
```typescript
export const ComponentName = reaxper(() => {
	const store = reaxel_ModuleName.store.xxx;
	const setState = reaxel_ModuleName.setState.xxx;
	const { method1, method2 } = reaxel_ModuleName();
	
	useEffect(() => {
		// 副作用
	}, []);
	
	return <div>...</div>;
});

import { ... } from '...';
import './index.less';
```

---

**🎉 遵守此规范，保持代码风格一致性！如有更新，及时同步本文档。** ✨
