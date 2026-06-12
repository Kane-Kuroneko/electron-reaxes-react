---
trigger: model_decision
description: Reaxes 框架开发指南 — 基于 MobX 的响应式状态管理，涵盖 reaxel、reaxper、createReaxable、obsReaction、distinctCallback 等核心 API
---

# Reaxes 开发指南

> 来源：`.qoder/skills/reaxes-development/SKILL.md`（2026-06-01），精简适配 Claude Code 格式。

## 核心概念

Reaxes 是基于 MobX 的响应式状态管理架构，提供统一的 Model 层编程范式，支持 React/Vue2/Vue3（Angular/Solid/Svelte 暂未实现）。

### 三大核心 API

| API | 用途 | 示例 |
|-----|------|------|
| `createReaxable` | 创建响应式状态 store | `const {store, setState, mutate} = createReaxable({...})` |
| `reaxel` | 构建分布式 & 响应式的业务逻辑/基础设施模块 | `export const reaxel_Core = reaxel(() => {...})` |
| `reaxper` | 包装响应式组件 | `export const MyComponent = reaxper(() => {...})` |

---

## Reaxel：分布式响应式业务逻辑模块

**核心理解**：`reaxel` 不是简单的"状态管理模块"，而是**分布式 & 响应式的业务逻辑或基础设施模块**。

特征：
- **分布式**：独立自治，可在应用任何位置被调用，无需 props 传递
- **响应式**：内部基于 MobX observable，状态变化自动触发依赖更新
- **单一实例**：全局单例，任何地方调用返回相同实例
- **职责范围**：状态管理 + 业务逻辑 + 基础设施能力（持久化/IPC/路由/i18n）+ 响应式副作用 + 对外 API

### Reaxel 典型结构

```typescript
export const reaxel_模块名 = reaxel( () => {
    // 1. 状态管理（基于 createReaxable）
    const { store, setState, mutate } = createReaxable( {
        // 响应式状态数据
    } );

    // 2. 业务逻辑封装（方法、算法、流程控制）
    const businessMethod = () => {
        // 复杂的业务逻辑处理
    };

    // 3. 基础设施能力（持久化、IPC 通信、路由、国际化等）
    rehance_BrowserPersist( 'key' )( { store, setState } );

    // 4. 响应式副作用（状态变化自动触发）
    obsReaction( () => {
        // 自动响应状态变化，执行副作用
    } , () => [ store.xxx ] );

    // 5. 对外 API（供组件或其他 reaxel 调用）
    const rtn = {
        businessMethod,
        updateData() { /* ... */ },
        getFilteredData() { /* ... */ },
    };

    return Object.assign( () => rtn , {
        store,
        setState,
        mutate
    } );
} );
```

**关键约定**：
- 导出命名为 `reaxel_模块名`（大驼峰）
- `rtn` 对象只包含业务方法，不包含 store/setState/mutate
- 使用 `Object.assign(() => rtn, { store, setState, mutate })` 模式
- 组件可直接访问 `reaxel_模块名.store.xxx` 读取状态
- 组件调用 `reaxel_模块名().方法名()` 执行业务逻辑

---

## 状态管理

### createReaxable

```typescript
const { store, setState, mutate, merge } = createReaxable( {
    count : 0,
    profile : { name : 'John', age : 30 },
    tags : [ 'developer' ],
} );
```

| 返回 | 类型 | 用途 |
|------|------|------|
| `store` | 响应式对象 | 读取状态 |
| `setState` | Proxy 函数 | 浅层更新（支持链式路径） |
| `mutate` | Proxy 函数 | 深层可变更新（回调函数） |
| `merge` | 函数 | 深度合并更新 |

> `setState` 和 `mutate` 都是 Proxy 实现——既是函数又有属性访问。直接调用更新根层，链式访问更新嵌套路径。

### 更新状态的三种方式

```typescript
// 方式1: setState - 浅层赋值（Proxy，可链式）
setState( { count : store.count + 1 } );       // 直接调用：更新根层属性
setState.profile( { name : 'Jane' } );         // 链式路径：更新嵌套对象

// 方式2: mutate - 深层可变更新（Proxy，可链式）
mutate( s => s.count = s.count + 1 );           // 直接调用：修改根层
mutate.profile( p => {                          // 链式路径：修改嵌套对象
    p.name = 'Jane';
    p.age = 25;
} );

// 方式3: merge - 深度合并
merge( { profile : { address : { city : 'New York' } } } );
```

---

## Rehance：reaxel 增强器

`rehance_XXX` 是 reaxel 内部的插件/增强器，为 store 添加额外能力。

### rehance_BrowserPersist

浏览器环境的 localStorage 持久化：

```typescript
// 柯里化调用：第一个括号传唯一 key，第二个括号传配置
rehance_BrowserPersist( persistKey: string )( {
    store,
    setState,
    filter?,   // 可选：过滤器函数，指定需要持久化的字段
} )
```

```typescript
// 最简用法：持久化整个 store
rehance_BrowserPersist( '|cheat-codes|' )( { store , setState } );

// 带 filter：排除某些字段
rehance_BrowserPersist( 'GUI' )( {
    store, setState,
    filter( s ) { return _.omit( s , 'switch_main' ); },
} );

// 带 filter：只持久化某些字段
rehance_BrowserPersist( '|theme|' )( {
    store, setState,
    filter( s ) { return _.pick( s , [ 'currentScheme' ] ); },
} );

import { rehance_BrowserPersist } from '#generics/rehancers/browser-persist';
```

---

## 组件开发

### React 函数组件（推荐）

```tsx
export const MainSwitch = reaxper( () => {  // 必须用 reaxper 包裹才能响应式更新
    const { toggleMainSwitch } = reaxel_HotkeyEnhancer();

    return (
        <Switch
            value={ reaxel_HotkeyEnhancer.store.switch_main }
            onChange={ () => { toggleMainSwitch(); } }
        />
    );
} );

import { reaxper } from 'reaxes-react';
import { reaxel_HotkeyEnhancer } from '#renderer/reaxels/hotkey-enhancer';
```

### React 类组件

```tsx
export const TestComponent = reaxper( class extends Reaxlass {
    reaxel_i18n_instance = reaxel_i18n();  // 类属性

    render() {
        const { changeLang, I18n, language, languageList } = reaxel_i18n();

        // 可以使用 React Hooks！
        const [ localState , setLocalState ] = useState( 'initial' );

        return ( /* JSX */ );
    }
} );

import { reaxper , Reaxlass } from 'reaxes-react';
```

- `Reaxlass`：为 class 组件提供 Hooks 能力和生命周期扩展
- `reaxper`：类似 `mobx::observer`，提供响应式渲染能力
- 两者独立——`class extends Reaxlass` 不必须搭配 `reaxper`，但搭配后才能响应式更新

| 特性 | 函数组件 | 类组件（Reaxlass） |
|------|----------|-------------------|
| Hooks 支持 | ✅ 原生 | ✅ Reaxlass 提供 |
| 响应式更新 | reaxper | reaxper |
| reaxel 调用 | render 内 | 类属性或 render 内 |

---

## 响应式副作用

### obsReaction — 依赖追踪反应

```typescript
function obsReaction<F extends (first?: boolean, disposer?: Disposer) => any>(
    callback: F,
    dependencies: () => Array<any>
): Disposer;  // 返回 disposer 函数
```

```typescript
obsReaction(
    ( first , disposer ) => {
        if( first ) {
            // 首次执行（异步 microtask 中触发）
            return;
        }
        // 依赖变化时执行
        console.log( 'Changed:' , store.count );
    } ,
    () => [ store.count , store.profile.name ]  // 依赖数组（浅比较）
);
```

特点：
- 自动浅比较依赖数组，仅在实际变化时触发回调
- `first` 参数标识首次调用，常用 `if(first) return` 跳过初始化
- `disposer` 可在回调内自我销毁，或从外部调用返回值销毁

### collectDeps — 手动收集依赖

`reaxper` 自动追踪首次渲染中读取的 `store.xxx`。以下场景需要 `collectDeps` 手动补充：
1. **条件分支内的属性**：首次渲染未走到该分支则不会被追踪
2. **不读取但需响应变化**：某属性不在 JSX 中使用，但变化时仍需重渲染

```typescript
export const MyComponent = reaxper( () => {
    collectDeps( store , [ 'count' , 'profile' ] );      // 手动收集
    collectDeps( store.profile , [ 'age' , 'name' ] );   // 深层依赖
    collectDeps( store );                                  // 监听整个 store

    // 条件分支：即使 isExpanded 为 false，details 变化时也能触发重渲染
    collectDeps( store , [ 'details' ] );
    if( store.isExpanded ) {
        return <div>{ store.details }</div>;
    }
    return <div>收起状态</div>;
} );
```

---

## 去重回调（distinctCallback）

`distinctCallback` 是**在组件外部创建、在视图组件内部调用**的智能回调包装器。每次渲染时可被重复调用，但内部通过依赖浅比较做去重。

```typescript
function distinctCallback<T extends (...args: any[]) => any>(
    callback: T,                   // 要执行的回调函数
    deps: () => any[],             // 初始依赖（用于首次比对基准 & resetDeps 恢复目标）
    initialValue?: ReturnType<T>,  // 可选初始缓存值
): DistinctCallbackInvoker<T>;

// 返回：既是函数又挂载 resetDeps 方法
type DistinctCallbackInvoker<T> = {
    (depsSetter: () => any[]): (...args: Parameters<T>) => ReturnType<T>;
    resetDeps(): void;
};
```

```typescript
// 在 reaxel 中创建
const distinctUsernameHandler = distinctCallback(
    ( actionType: string ) => {
        console.log( 'Username changed:', store.input_username, 'Action:', actionType );
    } ,
    () => [ store.input_username ],  // 初始依赖基准
);

// 在组件中使用（柯里化：depsSetter → 回调参数）
export default reaxper( () => {
    const { distinctUsernameHandler } = reaxel_Auth();

    // 每次渲染都调用，但只有依赖变化时才真正执行回调
    distinctUsernameHandler( () => [ reaxel_Auth.store.input_username ] )( 'login' );
} );
```

- **首次调用**：无 `initialValue` 时首次必定执行；有 `initialValue` 时依赖未变化则跳过
- **resetDeps()**：重置依赖缓存为初始值，强制下次调用执行
- **无需 Hooks**：不需要 `useEffect`、`useMemo`

### distinctCallback vs obsReaction

| 特性 | distinctCallback | obsReaction |
|------|-----------------|-------------|
| 调用方式 | 手动调用 invoker | 自动监听依赖 |
| 执行时机 | 调用时检查依赖 | 依赖变化时自动执行 |
| 使用场景 | 懒加载、组件渲染时去重 | 副作用、状态同步 |
| 首次执行 | 无 initialValue 时必定执行 | 立即执行（first=true） |

---

## 业务逻辑执行范式

### Way A：命令式调用（推荐用于业务主流程）

在 `rtn` 暴露的业务方法中，显式编排 setState + 后续逻辑的完整调用链：

```typescript
const rtn = {
    async updateProfile(profile: Profile) {
        setState({profile});
        const result = await requestUpdateProfile(store.profile);
        if (result.error) {
            setState({profile: previousProfile});  // 回滚
            notify.error('Update failed');
        }
    },
};
```

优势：保留完整事件流、支持 async/await、错误处理/回滚、逻辑集中易调试。

### Way B：响应式链（仅用于边缘副作用）

组件只 setState，后续逻辑由 `obsReaction` 监听 store 变动自动执行：

```typescript
// 仅适合：简单的、无条件的副作用同步
obsReaction((first) => {
    if (first) return;
    document.documentElement.setAttribute('theme', store.theme);
}, () => [store.theme]);
```

局限性：丢失事件流、调用链断裂、隐式依赖难以调试、不支持 async 顺序控制。

### 决策规则

| 判断条件 | 选择 |
|---------|------|
| 需要知道"谁触发了这个逻辑" | Way A |
| 包含 async/await 顺序依赖 | Way A |
| 需要错误处理/回滚 | Way A |
| 多步骤有序编排 | Way A |
| 纯粹的状态 → 外部系统同步 | Way B |
| 不关心触发源的观察性副作用 | Way B |
| 不确定选哪个 | **默认 Way A** |

```typescript
// ❌ 反模式：用 obsReaction 实现业务主流程
obsReaction(() => {
    requestUpdateProfile(store.profile);  // 无法区分触发源、无法回滚
}, () => [store.profile]);

// ✅ 正确：业务主流程用命令式，obsReaction 只管边缘副作用
const rtn = {
    updateProfile(profile: Profile) {
        setState({profile});
        requestUpdateProfile(store.profile);
    }
}
obsReaction((first) => {
    if (first) return;
    localStorage.setItem('profile', JSON.stringify(store.profile));
}, () => [store.profile]);
```

---

## Refaxel：reaxel 的多例工厂

当某段 reaxel 逻辑需要以**不同配置多例并存**时，应将其抽象为 Refaxel：

| | reaxel | Refaxel |
|---|--------|----------|
| 实例数量 | 全局单例 | 多例并存 |
| 命名 | `reaxel_Xxx` | `Refaxel_Xxx` |
| 配置 | 内部固定逻辑 | 通过参数注入不同配置 |

```typescript
// 定义 Refaxel 工厂
export const Refaxel_Counter = ( config: { initial: number; step: number } ) => {
    return reaxel( () => {
        const { store , setState } = createReaxable( { count : config.initial } );
        const rtn = {
            increment() { setState( { count : store.count + config.step } ); },
        };
        return Object.assign( () => rtn , { store , setState } );
    } );
};

// 多例并存，各自独立
const counterA = Refaxel_Counter( { initial : 0 , step : 1 } );
const counterB = Refaxel_Counter( { initial : 100 , step : 10 } );
```

---

## 与 MobX 的关系

| MobX | Reaxes | 说明 |
|------|--------|------|
| `observable` | `createReaxable` | 创建响应式状态 |
| `action` | 内置于 setState/mutate | 自动包装 |
| `reaction` | `obsReaction` | 优化版 reaction，自带浅比较 |
| `observer` | `reaxper` | 组件包装器 |
| `toJS` | `import { toJS } from 'reaxes'` | observable → 普通对象 |
| `untracked` | `import { untracked } from 'reaxes'` | 不触发依赖收集的读取 |

---

## 常用模式速查

### 直接访问 Store + 调用业务方法

```tsx
export const HotkeyEnhancer = reaxper( () => {
    const { language } = reaxel_I18n();                    // 读状态
    const { toggleMainSwitch } = reaxel_HotkeyEnhancer();  // 取方法

    return (
        <Switch
            value={ reaxel_HotkeyEnhancer.store.switch_main }  // 读 store
            onChange={ () => toggleMainSwitch() }                // 调方法
        />
    );
} );
```

### 列表操作

```typescript
const addItem = ( item: Item ) => {
    setState( { items : [ ...store.items , item ] } );
};

const removeItem = ( id: string ) => {
    setState( { items : store.items.filter( i => i.id !== id ) } );
};

const updateItem = ( id: string , updates: Partial<Item> ) => {
    mutate.items( items => {
        const item = items.find( i => i.id === id );
        if( item ) { Object.assign( item , updates ); }
    } );
};
```

### 统一导出

```typescript
// reaxels/exports.ts
export const { i18n } = reaxel_I18n();
export const I18n = createI18nReactComponent( reaxel_I18n );

// 使用方：
import { i18n, I18n } from '#renderer/reaxels/exports';
// i18n('文本')     → 翻译后的字符串
// <I18n>文本</I18n> → 响应式翻译组件（language 变化时自动重渲染）
```

### 导入顺序

所有 import 放在模块底部，按优先级从高到低：
```typescript
// 1. 相对路径业务导入
import { reaxel_Core } from '../reaxels/core';
// 2. 绝对路径/别名业务导入
import { reaxel_User } from '#reaxels/user';
// 3. 框架 / node_modules
import { reaxper } from 'reaxes-react';
import { createReaxable , obsReaction } from 'reaxes';
import Button from 'antd/lib/button';
// 4. 样式文件
import * as less from './index.module.less';
```

---

## 注意事项

1. **Object.assign 模式**：`return Object.assign(() => rtn, { store, setState, mutate })`
2. **组件读取状态**：直接访问 `reaxel_模块名.store.xxx`（在 reaxper 内自动响应）
3. **组件调用方法**：使用 `reaxel_模块名().方法名()`
4. **避免直接修改 store**：始终使用 `setState`/`mutate`/`merge`
5. **obsReaction 依赖数组**：确保列出所有依赖的属性，使用 `if (first) return` 跳过首次
6. **TypeScript 类型**：为 store 定义明确的接口类型，使用 `as Type[]` 初始化数组
