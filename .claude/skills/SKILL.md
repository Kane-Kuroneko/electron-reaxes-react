---
name: reaxes-development
description: Guide for developing with Reaxes architecture - a MobX-based reactive state management framework for multi-framework applications (React/Vue/Angular/Solid). Use when working with reaxel state modules, createReaxable stores, reaxper components, or building reactive UIs with the Reaxes ecosystem.
---

# Reaxes 开发指南

## 核心概念

Reaxes 是基于 MobX 的响应式状态管理架构，提供统一的Model层编程范式,计划支持多种UI框架（React/Vue2/Vue3(以上已实现) Angular/Solid/Svelte(暂未实现)）。

### 三大核心 API

| API              | 用途                      | 示例                                                        |
|------------------|-------------------------|-----------------------------------------------------------|
| `createReaxable` | 创建响应式状态 store           | `const {store, setState, mutate} = createReaxable({...})` |
| `reaxel`         | 构建分布式 & 响应式的业务逻辑/基础设施模块 | `export const reaxel_Core = reaxel(() => {...})`          |
| `reaxper`        | 包装响应式组件                 | `export const MyComponent = reaxper(() => {...})`         |

## Reaxel：分布式响应式业务逻辑模块

**核心理解**：`reaxel` 不是简单的"状态管理模块"，而是**分布式 & 响应式的业务逻辑或基础设施模块**。

### Reaxel 的本质特征

1. **分布式**：每个 reaxel 是独立自治的模块，可以在应用的任何位置被调用，无需通过 props 逐层传递
2. **响应式**：内部基于 MobX observable store，状态变化自动触发依赖更新
3. **业务逻辑封装**：不仅管理状态，还封装了完整的业务逻辑、数据处理和对外 API
4. **基础设施能力**：可以作为基础设施模块（如 i18n、theme、router、persist）提供服务
5. **单一实例**：每个 reaxel 在应用中是全局单例，任何地方调用都返回相同实例
6. **跨组件共享**：多个组件可以直接调用同一个 reaxel，共享状态和业务逻辑

### Reaxel 的职责范围

```typescript
export const reaxel_模块名 = reaxel( () => {
   // 1. 状态管理（基于 createReaxable）
   const {
      store ,
      setState ,
      mutate
   } = createReaxable( {
      // 响应式状态数据
   } );
   
   // 2. 业务逻辑封装（方法、算法、流程控制）
   const businessMethod = () => {
      // 复杂的业务逻辑处理
   };
   
   // 3. 基础设施能力（持久化、IPC 通信、路由、国际化等）
   rehance_BrowserPersist( 'key' )( {
      store ,
      setState
   } );
   
   // 4. 响应式副作用（状态变化自动触发）
   obsReaction( () => {
      // 自动响应状态变化，执行副作用
   } , () => [ store.xxx ] );
   
   // 5. 对外 API（供组件或其他 reaxel 调用）
   const rtn = {
      // 业务方法
      businessMethod ,
      // 数据操作方法
      updateData() { /* ... */ } ,
      // 查询方法
      getFilteredData() { /* ... */ } ,
   };
   
   return Object.assign( () => rtn , {
      store ,
      setState ,
      mutate
   } );
} );
```

### Reaxel 的典型应用场景

| 场景类型     | 示例                      | 说明                  |
|----------|-------------------------|---------------------|
| **业务模块** | `reaxel_HotkeyEnhancer` | 封装特定业务功能（快捷键增强）     |
| **数据管理** | `reaxel_CheatCodes`     | 管理特定领域数据（作弊码列表）     |
| **基础设施** | `reaxel_I18n`           | 提供国际化服务             |
| **基础设施** | `reaxel_Theme`          | 提供主题管理服务            |
| **基础设施** | `reaxel_GUI_Core`       | 管理路由/全局状态           |
| **跨层通信** | `reaxel_IPC`            | Electron 主进程/渲染进程通信 |
| **外部集成** | `reaxel_Lottie`         | 封装 Lottie 动画引擎      |

## 状态管理模式

### 1. 创建 Reaxable Store

```typescript
const {
   store ,
   setState ,
   mutate ,
   merge
} = createReaxable( {
   count : 0 ,
   profile : {
      name : 'John' ,
      age : 30 ,
   } ,
   tags : [ 'developer' ] ,
} );
```

**返回对象说明**：

- `store`: 响应式状态对象（读取）
- `setState`: 浅层更新（支持链式路径访问）
- `mutate`: 深层可变更新（通过回调函数）
- `merge`: 深度合并更新

> **Proxy 模式说明**：`setState` 和 `mutate` 都是基于 Proxy 实现的，因此它们**既是函数又有属性访问**。直接调用 `setState({...})` 更新根层，链式 `setState.profile({...})` 更新嵌套路径。`mutate` 同理。

### 2. 更新状态的三种方式

```typescript
// 方式1: setState - 浅层赋值更新（Proxy 实现，既是函数又可链式访问属性）
setState( { count : store.count + 1 } );     // 直接调用：更新根层属性
setState.profile( { name : 'Jane' } );       // 链式路径：更新嵌套对象

// 方式2: mutate - 深层可变更新（同样是 Proxy，支持直接调用和链式访问）
mutate( s => s.count = s.count + 1 );        // 直接调用：修改根层
mutate.profile( p => {                       // 链式路径：修改嵌套对象
   p.name = 'Jane';
   p.age = 25;
} );
mutate.profile.address( addr => {            // 更深层链式
   addr.city = 'Los Angeles';
} );

// 方式3: merge - 深度合并
merge( {
   profile : {
      address : {
         city : 'New York'
      }
   }
} );
```

### 3. 构建 Reaxel 模块

```typescript
// reaxels/hotkey-enhancer/index.ts
export const reaxel_HotkeyEnhancer = reaxel( () => {
   const {
      store ,
      setState ,
      mutate
   } = createReaxable( {
      switch_main : false ,
      checkbox_AutoSwitch : true ,
      switch_forbidWheelsZoom : true ,
   } );
   
   // 可选：持久化增强器
   rehance_BrowserPersist( 'GUI' )( {
      store ,
      setState
   } );
   
   // 响应式副作用 - 同步状态到 IPC
   obsReaction( ( first ) => {
      if( first ) return;
      IpcRendererSend( 'ahk' ).send( [
         {
            key : 'switch_main' ,
            value : store.switch_main
         } ,
      ] );
   } , () => [ store.switch_main ] );
   
   // 业务方法 - 使用 mutate 修改状态
   const toggleMainSwitch = ( value = !store.switch_main ) => {
      if( store.checkbox_AutoSwitch ) return;
      mutate( s => s.switch_main = value );
   };
   
   const toggleWheelsZoom = ( value = !store.switch_forbidWheelsZoom ) => {
      mutate( s => s.switch_forbidWheelsZoom = value );
   };
   
   // 返回对象：只包含业务方法
   const rtn = {
      toggleMainSwitch ,
      toggleWheelsZoom ,
      spawnAHK() { /* ... */ } ,
      shutdownAHK() { /* ... */ } ,
   };
   
   // 使用 Object.assign 挂载 store/setState/mutate
   return Object.assign( () => rtn , {
      store ,
      setState ,
      mutate ,
   } );
} );
```

**关键约定**：

- 导出命名为 `reaxel_模块名`（大驼峰）
- `rtn` 对象只包含业务方法，不包含 store/setState/mutate
- 使用 `Object.assign(() => rtn, { store, setState, mutate })` 模式
- 组件可直接访问 `reaxel_模块名.store.xxx` 读取状态
- 组件调用 `reaxel_模块名().方法名()` 执行业务逻辑

## Rehance：reaxel 增强器/插件

`rehance_XXX` 是作用于 reaxel 内部的插件/增强器，用于为 store 添加额外能力（如持久化、加密存储等）。命名约定为 `rehance_功能名`。

### rehance_BrowserPersist

为浏览器环境的 store 提供 localStorage 持久化功能：页面刷新后自动恢复之前的业务状态，store 变化时自动写入 localStorage。

```typescript
// 柯里化调用：第一个括号传唯一 key，第二个括号传配置
rehance_BrowserPersist( persistKey: string )( {
   store ,             // createReaxable 创建的 store
   setState ,          // createReaxable 创建的 setState
   filter? ,           // 可选：过滤器函数，指定哪些字段需要持久化
} )
```

**参数说明**：
- `persistKey`：唯一标识（重复会抛错），作为 localStorage 的 key
- `filter(store)`：可选过滤器，返回 store 的子集，只持久化返回的字段

**实际用法示例**：

```typescript
export const reaxel_CheatCodes = reaxel( () => {
   const { store , setState , mutate } = createReaxable( {
      cheatCodesData : [ ...originalCheatCodesData ] as DataType[] ,
   } );
   
   // 最简用法：持久化整个 store
   rehance_BrowserPersist( '|cheat-codes|' )( { store , setState } );
   
   // ...
} );

export const reaxel_HotkeyEnhancer = reaxel( () => {
   const { store , setState , mutate } = createReaxable( { /* ... */ } );
   
   // 带 filter：排除 switch_main 字段，其余都持久化
   rehance_BrowserPersist( 'GUI' )( {
      store , setState , filter( s ) {
         return _.omit( s , 'switch_main' );
      } ,
   } );
   
   // ...
} );

export const reaxel_Theme = reaxel( () => {
   const { store , setState , mutate } = createReaxable( {} );
   
   // 带 filter：只持久化 currentScheme 字段
   rehance_BrowserPersist( '|theme|' )( {
      store , setState , filter( s ) {
         return _.pick( s , [ 'currentScheme' ] );
      } ,
   } );
   
   // ...
} );

import { rehance_BrowserPersist } from '#generics/rehancers/browser-persist';
```

## 组件开发

### React 函数组件（推荐）

```tsx
// components/Main-Switch/index.tsx
export const MainSwitch = reaxper( () => { //必须用reaxper包裹才会根据响应式数据变化而自动更新
   // 调用 reaxel 获取业务方法
   const {
      toggleMainSwitch ,
      toggleAutoSwitch
   } = reaxel_HotkeyEnhancer();
   
   // 直接访问 store 读取状态（响应式）
   return (
      <div className={ less.mainSwitchContainer }>
         <Switch
            value={ reaxel_HotkeyEnhancer.store.switch_main }
            checkedChildren={ <span>Activing <LoadingOutlined /></span> }
            unCheckedChildren={ i18n( "Enable" ) }
            onChange={ () => {
               if( reaxel_HotkeyEnhancer.store.checkbox_AutoSwitch ) {
                  notification.warning( {
                     message : <I18n>When automatic detection is enabled...</I18n> ,
                  } );
               }
               toggleMainSwitch();
            } }
         />
         <Checkbox
            indeterminate={ reaxel_HotkeyEnhancer.store.checkbox_AutoSwitch }
            onChange={ ( e ) => toggleAutoSwitch( e.target.value ) }
         />
      </div>
   );
} );

import { reaxper } from 'reaxes-react';
import { reaxel_HotkeyEnhancer } from '#renderer/reaxels/hotkey-enhancer';
```

### React 类组件（支持 Hooks）

**重要**：`Reaxlass` 仅为 class 组件提供基础类，它的作用是扩展生命周期及在 render 函数内使用 Hooks 的能力。而根据响应式数据自动更新组件则是由 `reaxper` 提供的能力。
- `class extends Reaxlass`不是必须搭配reaxper使用,reaxper类似mobx::observer提供响应式渲染能力,而reaxlass则类似react::Component;
```tsx
export const Test_Reaxel_i18n = reaxper( class extends Reaxlass {
   // 类属性 - 调用 reaxel 获取方法（不是 Hooks）
   reaxel_i18n_instance = reaxel_i18n();
   
   render() {
      // 在 render 中调用 reaxel 获取响应式数据
      const {
         changeLang ,
         I18n ,
         language ,
         languageList
      } = reaxel_i18n();
      
      // 可以使用 React Hooks！（reaxper 内部处理）
      const [ localState , setLocalState ] = useState( 'initial' );
      const prevRef = useRef<string>();
      
      useEffect( () => {
         console.log( 'Component mounted' );
         return () => console.log( 'Component unmounted' );
      } , [] );
      
      useEffect( () => {
         // 监听 language 变化
         console.log( 'Language changed to:' , language );
      } , [ language ] );
      
      return (
         <div>
            <select
               value={ language }
               onChange={ ( e ) => changeLang( e.target.value ) }
            >
               { languageList.map( ( {
                  lang ,
                  name
               } ) => (
                  <option
                     value={ lang }
                     key={ lang }
                  >{ name }</option>
               ) ) }
            </select>
            <p><I18n>By stakeholders, for stakeholders.</I18n></p>
         </div>
      );
   }
} );

import { reaxper , Reaxlass } from 'reaxes-react';
import { useState , useEffect , useRef } from 'react';
```

### 类组件特性

`Reaxlass` 提供了一些额外的生命周期管理功能：

```typescript
export const AdvancedComponent = reaxper( class extends Reaxlass {
   // 调用 reaxel
   myReaxel = reaxel_MyModule();
   
   // 自定义 render 方法
   render() {
      const { data } = reaxel_MyModule();
      
      // 可以使用所有 React Hooks
      const [ count , setCount ] = useState( 0 );
      const memoizedValue = useMemo( () => computeExpensive( data ) , [ data ] );
      
      return <div>{ memoizedValue }</div>;
   }
   
   // didMount 和 didUpdate 都要执行的逻辑
   componentDidRender( stage: 'mount' | 'update' , prevProps , prevState , snapshot ) {
      if( stage === 'mount' ) {
         console.log( 'First render' );
      } else {
         console.log( 'Re-rendered' );
      }
   }
} );
```

### 类组件 vs 函数组件

| 特性        | 函数组件       | 类组件（Reaxlass）                            |
|-----------|------------|------------------------------------------|
| Hooks 支持  | ✅ 原生支持     | ✅ Reaxlass 提供（可在 render 中使用）             |
| 响应式更新     | reaxper 提供 | reaxper 提供                               |
| reaxel 调用 | render 内调用 | 类属性或 render 内调用                          |
| 生命周期      | useEffect  | componentDidMount 等 + componentDidRender |

## 去重回调（distinctCallback）

`distinctCallback` 是一个**在组件外部创建、(主要是)在MVVM框架的视图组件内部调用**的智能回调包装器。它的核心设计意图是可在每次渲染时被重复调用，但内部通过依赖浅比较做去重：依赖未变化时跳过回调执行并返回缓存结果。

> **首次调用行为**：无 `initialValue` 时首次调用**必定执行**（因为内部 lastResult 未初始化）；有 `initialValue` 时首次调用若依赖未变化则**不执行回调**，直接返回 `initialValue`。

### 函数签名

```typescript
function distinctCallback<T extends (...args: any[]) => any>(
   callback: T,                    // 要执行的回调函数
   deps: () => any[],              // 初始依赖（用于首次比对基准 & resetDeps 恢复目标）
   initialValue?: ReturnType<T>,   // 可选的初始缓存值（有值时首次依赖未变化不执行回调，直接返回此值）
): DistinctCallbackInvoker<T>;

// 返回的 invoker 类型：既是函数又挂载了 resetDeps 方法
type DistinctCallbackInvoker<T> = {
   (depsSetter: () => any[]): (...args: Parameters<T>) => ReturnType<T>;
   resetDeps(): void;  // 重置依赖缓存为创建时的初始 deps，强制下次调用时执行
};
```

### 双 deps 设计说明

| | 创建时的 `deps` | 调用时传入的 `depsSetter` |
|---|---|---|
| **作用** | 初始化/预设的依赖基准值 | 本次调用时获取的最新依赖值 |
| **何时求值** | 创建时立即执行一次，得到初始 depList | 每次 invoker 被调用时执行 |
| **比对逻辑** | 作为「上一次」的基准 | 与缓存的 depList 做浅比较 |
| **resetDeps 关联** | `resetDeps()` 会重新执行此函数，将 depList 重置回初始值 | 无关 |

**工作流程**：创建时 → `depList = deps()` 作为初始基准，`lastResult = initialValue ?? UNINITIALIZED` → 每次调用 `invoker(depsSetter)` → `tempDeps = depsSetter()` → 返回 handler → 调用 handler(...args) 时与 `depList` 浅比较 → **依赖变化 OR lastResult === UNINITIALIZED** 则执行 callback 并更新 `depList = tempDeps` 和 `lastResult`，否则直接返回缓存的 `lastResult`。

### 核心特性

- **创建位置**：在 reaxel 模块内部或组件外部（模块级别）
- **调用位置**：搭配React组件使用时直接在组件内顶层调用. 但仍然可在任何可能重复执行的场景中使用,react组件只是这种场景的一个子集.
- **执行条件**：`depsChanged || lastResult === UNINITIALIZED` 为真时执行回调。即：① 依赖变化时执行；② 无 `initialValue` 时首次必定执行（因为 `lastResult` 初始为 UNINITIALIZED）；③ 有 `initialValue` 时首次依赖未变化则不执行，直接返回 `initialValue`
- **无需 Hooks**：不需要 `useEffect`、`useMemo` 等 React Hooks
- **柯里化调用**：`invoker(depsSetter)(…args)` — 第一个括号传最新依赖获取函数，第二个括号传回调参数

### 基本用法

```typescript
// 在 reaxel 模块内部创建
export const reaxel_Auth = reaxel( () => {
   const {
      store ,
      setState ,
      mutate ,
   } = createReaxable( {
      input_username : '' ,
      token : null as string | null ,
   } );
   
   // 创建 distinctCallback
   // deps: () => [store.input_username] 作为初始依赖基准
   const distinctUsernameHandler = distinctCallback(
      ( actionType: string ) => {
         console.log( 'Username changed to:' , store.input_username , 'Action:' , actionType );
      } ,
      () => [ store.input_username ] ,  // 初始依赖基准 & resetDeps 恢复目标
   );
   
   const rtn = {
      setInputName( name: string ) {
         setState( { input_username : name } );
      } ,
      distinctUsernameHandler ,
   };
   
   return Object.assign( () => rtn , {
      store ,
      setState ,
      mutate ,
   } );
} );
```

### 在组件中使用

```tsx
export default reaxper( () => {
   const {
      setInputName ,
      distinctUsernameHandler
   } = reaxel_Auth();
   
   // 柯里化调用：第一个括号传入当前最新依赖，第二个括号传入回调参数
   // 每次渲染都会调用，但只有 input_username 相比上次有变化时才真正执行回调
   distinctUsernameHandler( () => [ reaxel_Auth.store.input_username ] )( 'login' );
   
   return (
      <div>
         <input
            value={ reaxel_Auth.store.input_username }
            onChange={ ( e ) => {
               setInputName( e.target.value );
            } }
         />
      </div>
   );
} );
```

### resetDeps 用法

`resetDeps` 是挂载在 invoker 函数上的方法（非元组解构），用于将内部依赖缓存重置为创建时的初始 deps 值，强制下次调用时必然执行回调：

```typescript
// 创建 - 返回的是一个带 resetDeps 方法的函数，不是元组
const distinctInvoker = distinctCallback(
   ( name: string , age: number ) => {
      console.log( 'User info changed:' , name , age );
   } ,
   () => [ store.name , store.age ]
);

// 在 reaxel 中暴露
const rtn = {
   distinctInvoker ,
   // resetDeps 是 distinctInvoker 上的方法
   resetUserDeps() { distinctInvoker.resetDeps(); } ,
   updateUserInfo( name: string , age: number ) {
      setState( { name , age } );
   } ,
};

// 组件中使用
export const UserProfile = reaxper( () => {
   const { distinctInvoker , resetUserDeps } = reaxel_User();
   
   // 柯里化调用
   distinctInvoker( () => [
      reaxel_User.store.name ,
      reaxel_User.store.age
   ] )( reaxel_User.store.name , reaxel_User.store.age );
   
   return <button onClick={ resetUserDeps }>Reset Deps</button>;
} );
```

### initialValue 用法

当已有缓存数据时，可通过第三参数避免首次不必要的计算：

```typescript
// 有缓存时不执行回调，直接返回 cachedProfile
const distinctFetchProfile = distinctCallback(
   ( userId: string ) => fetchUserProfile( userId ) ,
   () => [ store.userId ] ,
   cachedProfile ,  // 初始缓存值
);

// 组件中：如果 userId 未变化，直接返回 cachedProfile 而不发请求
const profile = distinctFetchProfile( () => [ store.userId ] )( store.userId );
```

### 与 obsReaction 的对比

| 特性         | `distinctCallback` | `obsReaction`    |
|------------|--------------------|------------------|
| 调用方式       | 手动调用 invoker       | 自动监听依赖变化         |
| 执行时机       | 调用时检查依赖            | 依赖变化时自动执行        |
| 使用场景       | 懒加载、组件渲染时去重执行   | 副作用、状态同步         |
| 是否需要 Hooks | ❌ 不需要              | ❌ 不需要            |
| 首次执行       | 无 initialValue 时首次必定执行；有 initialValue 则按依赖判断 | 立即执行（first=true） |

### 实际应用场景

**场景 1：表单输入防抖处理**

```tsx
// reaxel 内创建
export const reaxel_Search = reaxel( () => {
   const {
      store ,
      setState
   } = createReaxable( {
      query : '' ,
      results : [] ,
   } );
   
   // 只在 query 真正改变时才发起搜索请求
   const distinctSearch = distinctCallback(
      async() => {
         if( store.query.trim() ) {
            const results = await fetchSearchResults( store.query );
            setState( { results } );
         }
      } ,
      () => [ store.query ]
   );
   
   return Object.assign( () => {
      return {
         distinctSearch,
		}
   } , {
      store ,
      setState
   } );
} );

// 组件中使用
export const SearchBox = reaxper( () => {
   const { distinctSearch } = reaxel_Search();
   
   return (
      <input
         onChange={ ( e ) => {
            reaxel_Search.setState( { query : e.target.value } );
            // 安全调用 - 只有 query 真正改变时才发起请求
            distinctSearch( () => [ reaxel_Search.store.query ] )();
         } }
      />
   );
} );
```

**场景 2：多依赖条件执行**

```typescript
// 监听多个状态，任一改变才执行
export const distinctProfileUpdate = distinctCallback(
   () => {
      console.log( 'Profile updated:' , {
         name : store.name ,
         age : store.age ,
         email : store.email ,
      } );
      updateProfileAPI( store );
   } ,
   () => [
      store.name ,
      store.age ,
      store.email
   ]
);
```

## 响应式副作用

### obsReaction - 依赖追踪反应

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
         console.log( 'Initial:' , store.count );
         return;
      }
      // 依赖变化时执行
      console.log( 'Changed:' , store.count );
   } ,
   () => [
      store.count ,
      store.profile.name
   ]  // 依赖数组
);
```

**特点**：

- 自动浅比较依赖数组，仅在实际变化时触发回调
- `first` 参数标识首次调用，常用 `if(first) return` 跳过初始化
- `disposer` 调用后停止监听，永久销毁此 reaction（类似 `mobx::reaction` 返回的 dispose）
- obsReaction 本身也返回 disposer，可从外部销毁

### disposer 用法示例

```typescript
// 方式1：从外部获取 disposer 并在需要时销毁
const disposer = obsReaction( ( first ) => {
   if( first ) return;
   syncToServer( store.data );
} , () => [ store.data ] );

// 某个时机不再需要监听时：
disposer();  // 停止 reaction，后续 store.data 变化不再触发

// 方式2：在回调内部根据条件自我销毁
obsReaction( ( first , disposer ) => {
   if( first ) return;
   if( store.count >= 10 ) {
      console.log( '目标达成，停止监听' );
      disposer();  // 在回调内部销毁自己
      return;
   }
   console.log( 'count:' , store.count );
} , () => [ store.count ] );
```

### collectDeps - 在响应式环境手动收集依赖

`reaxper` 会自动追踪组件首次渲染中直接读取的 `store.xxx` 作为依赖。但以下场景需要 `collectDeps` 手动补充依赖：

1. **条件分支内的属性**：某些属性在 `if` 分支中，首次渲染未走到该分支则不会被追踪
2. **不读取但需响应变化**：某属性不在 JSX 中使用，但变化时仍需重渲染组件

**重要**：`collectDeps` 必须在 observer 依赖收集环境下调用才有作用（即在 `reaxper` 包装的组件 render 中，或 MobX `autorun`/`reaction` 内部）。在普通函数中调用无效。

```typescript
// 原理：collectDeps 本质是读取属性值以触发 MobX 的依赖收集
export const MyComponent = reaxper( () => {
   // 手动收集：即使下方 JSX 中未直接使用 count，它变化时也会触发重渲染
   collectDeps( store , [ 'count' , 'profile' ] );
   
   // 收集深层依赖
   collectDeps( store.profile , [ 'age' , 'name' ] );
   
   // 不传第二个参数则监听整个 store 所有属性
   collectDeps( store );
   
   // 条件分支示例：即使 store.isExpanded 为 false，details 变化时也能触发重渲染
   collectDeps( store , [ 'details' ] );
   if( store.isExpanded ) {
      return <div>{ store.details }</div>;
   }
   return <div>收起状态</div>;
} );
```

## 业务逻辑执行范式：命令式 vs 响应式

Reaxes 中执行业务逻辑有两种核心范式。理解它们的适用场景和局限性是写出可维护代码的关键。

### Way A 完整示例：命令式调用

```typescript
// reaxels/user.ts
export const reaxel_User = reaxel(() => {
   const {store,setState,mutate,merge} = createReaxable({
      profile:{
         age:20,
         gender:"male",
         name:"Hack",
      },
      bio : 'A hard man'
   })

   const rtn = {
      // 在业务方法内显式编排完整调用链：setState + 后续逻辑
      updateProfile(profile: Profile){
         setState({profile});
         requestUpdateProfile(store.profile)  // 紧跟 setState，明确因果
      }
   }

   return Object.assign(() => rtn,{
      store,
      setState,
      mutate,
      merge,
   })
})
```

```tsx
// UpdateUserAge.tsx —— 组件通过调用业务方法触发完整流程
const UpdateUserAge = reaxper(() => {
   const {updateProfile} = reaxel_User();
   return <button onClick={() => {
      // 显式调用业务方法，事件流清晰：点击 → updateProfile → setState + request
      updateProfile({
         ...reaxel_User.store.profile,
         age: reaxel_User.store.profile.age + 1,
      });
   }}>
      update
   </button>
})
```

### Way B 完整示例：响应式链

```typescript
// reaxels/user.ts
export const reaxel_User = reaxel(() => {
   const {store,setState,mutate,merge} = createReaxable({
      profile:{
         age:20,
         gender:"male",
         name:"Hack",
      },
      bio : 'A hard man'
   })

   // 监听 store.profile.age 变动，自动执行请求（不关心是谁改的）
   obsReaction(() => {
      requestUpdateProfile(store.profile);
   },() => [store.profile.age]);

   // 不暴露业务方法，外部直接用 setState 修改数据即可
   return Object.assign(() => ({}),{
      store,
      setState,
      mutate,
      merge,
   })
})
```

```tsx
// UpdateUserAge.tsx —— 组件只负责修改数据，后续逻辑由 reaction 自动响应
const UpdateUserAge = reaxper(() => {
   return <button onClick={() => {
      // 只 setState，不手动调用 requestUpdateProfile
      // obsReaction 监听到 age 变化后会自动发起请求
      reaxel_User.setState.profile({age: reaxel_User.store.profile.age + 1})
   }}>
      update
   </button>
})
```

### Way A：命令式调用（推荐用于业务主流程）

**模式**：在 `rtn` 暴露的业务方法中，显式编排 setState + 后续逻辑的完整调用链。

```typescript
const rtn = {
   async updateProfile(profile: Profile) {
      setState({profile});
      const result = await requestUpdateProfile(store.profile);
      if (result.error) {
         // 错误处理、回滚、通知等 —— 都在同一调用链中
         setState({profile: previousProfile});
         notify.error('Update failed');
      }
   },
   async login(credentials: Credentials) {
      setState({loading: true});
      const token = await authAPI.login(credentials);
      setState({token, loading: false});
      await fetchUserProfile(token);  // 登录后立即拉取用户信息
      router.navigate('/dashboard');  // 然后跳转
   }
}
```

**优势**：
- 保留完整的事件流/调用链，可追踪「谁触发了什么」
- 支持 async/await，可处理异步顺序、错误恢复、条件分支
- 逻辑集中，便于调试和代码审查
- 扩展性强：新增步骤只需在方法内追加，不会影响其他 reaction

**适用场景**：
- 用户交互触发的业务主流程（表单提交、登录、支付等）
- 需要错误处理和回滚的操作
- 多步骤有序编排（A → B → C 必须顺序执行）
- 需要明确知道「是哪个操作导致了这个请求」的场景

### Way B：响应式链（仅用于边缘副作用）

**模式**：组件/外部只 setState 修改数据，后续逻辑由 `obsReaction` 监听 store 变动自动执行。

```typescript
// 仅适合：简单的、无条件的副作用同步
obsReaction((first) => {
   if (first) return;
   // store.theme 变了就同步 DOM 属性 —— 典型的边缘副作用
   document.documentElement.setAttribute('theme', store.theme);
}, () => [store.theme]);

obsReaction((first) => {
   if (first) return;
   // 状态变化后同步到 localStorage —— 无需知道谁改的
   localStorage.setItem('settings', JSON.stringify(store.settings));
}, () => [store.settings]);
```

**局限性（规模复杂时暴露的缺陷）**：
- **丢失事件流**：无法区分「用户点击」还是「系统初始化」触发的同一 store 变动
- **调用链断裂**：多个 reaction 各自执行，无法控制顺序，无法做条件分支
- **隐式依赖**：reaction 之间的执行顺序不可预测，A reaction 修改了 store 导致 B reaction 触发，形成难以调试的级联
- **错误处理困难**：reaction 内抛错无法回溯到触发源，无法实现「失败则回滚」
- **不支持 async 顺序控制**：多个异步 reaction 并发执行，无法保证时序

**仅适用场景**：
- 状态到 DOM/外部系统的单向同步（theme → DOM attribute）
- 持久化同步（store → localStorage/IPC）
- 日志/埋点等纯观察性副作用
- 不关心触发源、不需要错误回溯的场景

### 决策规则

| 判断条件 | 选择 |
|---------|------|
| 需要知道「谁触发了这个逻辑」 | Way A |
| 包含 async/await 顺序依赖 | Way A |
| 需要错误处理/回滚 | Way A |
| 多步骤有序编排 | Way A |
| 纯粹的状态 → 外部系统同步 | Way B |
| 不关心触发源的观察性副作用 | Way B |
| 不确定选哪个 | **默认 Way A** |

### 反模式警告

```typescript
// ❌ 反模式：用 obsReaction 实现业务主流程
obsReaction(() => {
   // 问题：无法区分是用户修改还是服务端推送导致的 profile 变化
   // 问题：如果 requestUpdateProfile 失败，无法回滚
   // 问题：如果还有其他 reaction 也监听 profile，执行顺序不可控
   requestUpdateProfile(store.profile);
}, () => [store.profile]);

// ✅ 正确：业务主流程用命令式方法
const rtn = {
   updateProfile(profile: Profile) {
      setState({profile});
      requestUpdateProfile(store.profile);
   }
}
// obsReaction 只负责边缘副作用（如同步到 localStorage）
obsReaction((first) => {
   if (first) return;
   localStorage.setItem('profile', JSON.stringify(store.profile));
}, () => [store.profile]);
```

## 项目架构规范

### 目录结构

```
src/
├── reaxels/              # 状态管理模块
│   ├── auth/
│   │   └── index.ts     # reaxel_Auth
│   ├── user/
│   │   └── index.ts     # reaxel_User
│   └── settings/
│       └── index.ts     # reaxel_Settings
├── components/           # UI 组件
│   ├── SporeList/
│   │   └── index.tsx
│   └── UserCard/
│       └── index.tsx
└── views/                # 页面视图
    └── Dashboard/
        └── index.tsx
```

### 命名约定（最新范式）

| 类型          | 命名模式                  | 示例                                           |
|-------------|-----------------------|----------------------------------------------|
| Reaxel 模块   | `reaxel_模块名`（大驼峰）     | `reaxel_HotkeyEnhancer`, `reaxel_CheatCodes` |
| Store 访问    | `reaxel_模块名.store`    | `reaxel_HotkeyEnhancer.store.switch_main`    |
| SetState 访问 | `reaxel_模块名.setState` | `reaxel_HotkeyEnhancer.setState({...})`      |
| Mutate 访问   | `reaxel_模块名.mutate`   | `reaxel_HotkeyEnhancer.mutate(s => ...)`     |
| 业务方法        | 放在 `rtn` 对象中          | `toggleMainSwitch()`, `dragToSort()`         |
| 响应式组件       | 大驼峰                   | `MainSwitch`, `HotkeyEnhancer`               |

### 导入顺序

**重要**：所有 ESM import 声明放在模块底部，按以下优先级排序：

```typescript
// === 模块主体代码 ===
export const MyComponent = reaxper( () => {
   // ...
} );

// === 底部：Import 声明（优先级从高到低） ===
// 1. 相对路径业务导入
import { reaxel_Core } from '../reaxels/core';

// 2. 绝对路径业务导入
import { reaxel_User } from '#reaxels/user';

// 3. reaxes 框架 / node_modules
import { reaxper } from 'reaxes-react';
import { createReaxable , obsReaction } from 'reaxes';
import Button from 'antd/lib/button';

// 4. 样式文件
import * as less from './index.module.less';
```

## 构建与运行

### 开发环境

```bash
# 启动 React 开发服务器
npm start react 4399

# 启动 Vue3 开发服务器
npm start vue3 7788

# 启动 Vue2 开发服务器
npm start vue2 8964
```

### 构建打包

```bash
# 构建 reaxes 核心库
npm run build reaxes

# 构建子包
npm run build refaxels/i18n
```

### 发布

```bash
# 发布 patch 版本
npm run publish reaxes patch

# 发布 alpha 版本
npm run publish reaxes patch alpha
```

## 常见模式

### 模式 1: 多 Reaxel 协作（最新范式）

```tsx
export const HotkeyEnhancer = reaxper( () => {
   // 直接访问 store 读取响应式状态
   const { language } = reaxel_I18n();
   
   // 调用业务方法（如果需要）
   const { toggleMainSwitch } = reaxel_HotkeyEnhancer();
   
   return (
      <MainConententAreaContainer>
         <div style={ { width : languageWidthMap[language] } }>
            <AltInventory />
            <ForbidMouseWheels />
            <ReplaceF6 />
            <MainSwitch />
         </div>
      </MainConententAreaContainer>
   );
} );
```

### 模式 2: 直接访问 Store + 拖拽排序

```tsx
export const Cheats = reaxper( () => {
   // 获取业务方法
   const { dragToSort } = reaxel_CheatCodes();
   
   // 直接访问 store 获取数据（响应式）
   const onDragEnd = ( {
      active ,
      over
   }: DragEndEvent ) => {
      if( active.id !== over?.id ) {
         const originalCopy = [ ...reaxel_CheatCodes.store.cheatCodesData ];
         const activeIndex = originalCopy.findIndex( i => i.key === active.id );
         const overIndex = originalCopy.findIndex( i => i.key === over?.id );
         dragToSort( arrayMove( originalCopy , activeIndex , overIndex ) );
      }
   };
   
   return (
      <DndContext onDragEnd={ onDragEnd }>
         <SortableContext items={ reaxel_CheatCodes.store.cheatCodesData.map( i => i.key ) }>
            <Table dataSource={ reaxel_CheatCodes.store.cheatCodesData } />
         </SortableContext>
      </DndContext>
   );
} );
```

### 模式 3: 条件渲染

```tsx
export const AuthGuard = reaxper( () => {
   if( !reaxel_User.store.isAuthenticated ) {
      return <LoginPage />;
   }
   
   return <Dashboard />;
} );
```

### 模式 4: 列表操作

```tsx
const addItem = ( item: Item ) => {
   setState( {
      items : [
         ...store.items ,
         item
      ]
   } );
};

const removeItem = ( id: string ) => {
   setState( {
      items : store.items.filter( i => i.id !== id )
   } );
};

const updateItem = ( id: string , updates: Partial<Item> ) => {
   mutate.items( items => {
      const item = items.find( i => i.id === id );
      if( item ) {
         Object.assign( item , updates );
      }
   } );
};
```

## 高级模式与最佳实践

### 模式 5: 列表操作与拖拽排序

```typescript
export const reaxel_CheatCodes = reaxel( () => {
   const {
      store ,
      setState ,
      mutate
   } = createReaxable( {
      cheatCodesData : [ ...originalCheatCodesData ] as DataType[] ,
   } );
   
   // 持久化
   rehance_BrowserPersist( '|cheat-codes|' )( {
      store ,
      setState
   } );
   
   const rtn = {
      // 拖拽排序 - 替换整个数组
      dragToSort( cheatCodesData: DataType[] ) {
         setState( { cheatCodesData } );
      } ,
      // 重置数据
      resetCheatCodes() {
         setState( { cheatCodesData : originalCheatCodesData } );
      } ,
      // 添加单项（使用 setState）
      addCheatCode( code: DataType ) {
         setState( {
            cheatCodesData : [
               ...store.cheatCodesData ,
               code
            ] ,
         } );
      } ,
      // 更新单项（使用 mutate）
      updateCheatCode( key: string , updates: Partial<DataType> ) {
         mutate.cheatCodesData( data => {
            const item = data.find( i => i.key === key );
            if( item ) {
               Object.assign( item , updates );
            }
         } );
      } ,
      // 删除单项（使用 setState + filter）
      removeCheatCode( key: string ) {
         setState( {
            cheatCodesData : store.cheatCodesData.filter( i => i.key !== key ) ,
         } );
      } ,
   };
   
   return Object.assign( () => rtn , {
      store ,
      setState ,
      mutate
   } );
} );
```

### 模式 6: IPC 通信与状态同步（Electron 环境）

> 此模式仅适用于 Electron 应用，`IpcRendererSend`/`IpcRendererOn` 是对 Electron ipcRenderer 的封装。

```typescript
export const reaxel_HotkeyEnhancer = reaxel( () => {
   const {
      store ,
      setState ,
      mutate
   } = createReaxable( {
      switch_main : false ,
      switch_forbidWheelsZoom : true ,
   } );
   
   // 监听 IPC 事件 - 更新本地状态
   IpcRendererOn( 'ahk-cp-status' ).on( ( e , data ) => {
      setState( { switch_main : data } );
   } );
   
   // 初始化时发送当前状态到主进程
   IpcRendererSend( 'ahk' ).send( [
      {
         key : 'switch_main' ,
         value : store.switch_main
      } ,
      {
         key : 'switch_forbidWheelsZoom' ,
         value : store.switch_forbidWheelsZoom
      } ,
   ] );
   
   // 状态变化时自动同步到主进程
   obsReaction( ( first ) => {
      if( first ) return;
      IpcRendererSend( 'ahk' ).send( [
         {
            key : 'switch_main' ,
            value : store.switch_main
         } ,
      ] );
   } , () => [ store.switch_main ] );
   
   obsReaction( ( first ) => {
      if( first ) return;
      IpcRendererSend( 'ahk' ).send( [
         {
            key : 'switch_forbidWheelsZoom' ,
            value : store.switch_forbidWheelsZoom
         } ,
      ] );
   } , () => [ store.switch_forbidWheelsZoom ] );
   
   const rtn = {
      toggleMainSwitch( value = !store.switch_main ) {
         mutate( s => s.switch_main = value );
      } ,
   };
   
   return Object.assign( () => rtn , {
      store ,
      setState ,
      mutate
   } );
} );
```

### 模式 7: Hash 路由管理

```typescript
export const reaxel_GUI_Core = reaxel( () => {
   const {
      store ,
      setState ,
      mutate
   } = createReaxable( {
      hash : '#/hotkey-enhancer' ,
   } );
   
   // 持久化路由状态
   rehance_BrowserPersist( 'GUI_Core' )( {
      store ,
      setState
   } );
   
   // 初始化：如果 URL 有 hash 则同步到 store，否则设置 URL
   obsReaction( ( first ) => {
      const hash = location.hash;
      if( first && hash.replace( '#/' , '' ) ) {
         setState( { hash } );
         return;
      } else {
         location.hash = store.hash;
      }
   } , () => [ store.hash ] );
   
   // 监听 hashchange 事件
   window.addEventListener( 'hashchange' , () => {
      setState( { hash : location.hash } );
   } );
   
   return Object.assign( () => (
      {}
   ) , {
      store ,
      setState ,
      mutate
   } );
} );
```

### 模式 8: 嵌套 Refaxel 组合

参见下方「Refaxel：reaxel 的多例工厂」章节的「主从组合用法」完整示例（`reaxel_Theme` + `Refaxel_Lottie`）。

### 模式 9: 统一导出（Exports）

```typescript
// reaxels/exports.ts
// 从 reaxel_I18n 提取常用导出，方便其他模块使用
export const { i18n } = reaxel_I18n();
// createI18nReactComponent: 将 reaxel_I18n 传入，构造一个依赖 store.language 变化而自动重新渲染翻译文本的 React 组件
// 本质就是一个 reaxper 包装的组件，内部读取 I18n_Store.language 触发响应式更新
export const I18n = createI18nReactComponent( reaxel_I18n );

// 使用方：
// import { i18n, I18n } from '#renderer/reaxels/exports';
// i18n('文本')     → 返回翻译后的字符串
// <I18n>文本</I18n> → 渲染翻译后的 React 元素，language 变化时自动重渲染

import { reaxel_I18n } from '../reaxels/i18n';
import { createI18nReactComponent } from '#generics/refaxels/i18n/views/react';
```

## 注意事项（重要）

1. **最新范式 - Object.assign 模式**:
   ```typescript
   return Object.assign(() => rtn, { store, setState, mutate });
   ```
   - `rtn` 只包含业务方法
   - `store/setState/mutate` 挂载到工厂函数上供直接访问

2. **组件读取状态**: 直接访问 `reaxel_模块名.store.xxx`（在 reaxper 内自动响应）
3. **组件调用方法**: 使用 `reaxel_模块名().方法名()`
4. **避免直接修改 store**: 始终使用 `setState`/`mutate`/`merge`
5. **obsReaction 依赖数组**: 确保列出所有依赖的属性，使用 `if (first) return` 跳过首次执行
6. **TypeScript 类型**: 为 store 定义明确的接口类型，使用 `as Type[]` 初始化数组

## 与 MobX 的关系

Reaxes 底层使用 MobX，但提供了更简洁的 API：

| MobX         | Reaxes              | 说明           |
|--------------|---------------------|--------------|
| `observable` | `createReaxable`    | 创建响应式状态      |
| `action`     | 内置于 setState/mutate | 自动包装         |
| `reaction`   | `obsReaction`       | 优化版 reaction，自带浅比较 |
| `observer`   | `reaxper`           | 组件包装器        |
| `toJS`       | `import { toJS } from 'reaxes'` | 将 observable 转为普通 JS 对象 |
| `untracked`  | `import { untracked } from 'reaxes'` | 在不触发依赖收集的情况下读取 observable |

## Refaxel：reaxel 的多例工厂

### 核心概念

**Refaxel** 本质是 reaxel 的工厂函数。它实例化后产生的是**完整功能的 reaxel**，与普通 reaxel 唯一的区别是：

| | reaxel | Refaxel |
|---|--------|----------|
| **实例数量** | 全局单例 | 多例并存（每次调用产生独立实例） |
| **命名** | `reaxel_Xxx` | `Refaxel_Xxx` |
| **配置** | 内部固定逻辑 | 通过参数注入不同配置 |
| **调用结果** | 永远返回同一实例 | 每次返回新的独立 reaxel |

**一句话区分**：`reaxel` 是单例工厂（全局唯一），`Refaxel` 是多例工厂（可并存多个独立实例）。实例化后得到的东西完全相同——都是完整的 reaxel。

### 独立使用

Refaxel 实例化后就是完整的 reaxel，可以直接在任何地方独立使用：

```typescript
// 实例化多个独立的 i18n 实例（商店多语言、后台多语言…）
const reaxel_ShopI18n = Refaxel_I18n( { defaultLang : 'zh-CN' , namespace : 'shop' } );
const reaxel_AdminI18n = Refaxel_I18n( { defaultLang : 'en-US' , namespace : 'admin' } );

// 每个实例都是完整的 reaxel，独立使用
reaxel_ShopI18n.store.language;    // 'zh-CN'
reaxel_AdminI18n.store.language;   // 'en-US'
reaxel_ShopI18n().changeLang( 'ja' );  // 不影响 AdminI18n
```

### 主从组合用法

当需要将 Refaxel 实例作为某个 reaxel 的内部能力时，可以在 reaxel 内实例化并组合：

```typescript
export const reaxel_Theme = reaxel( () => {
   const { store , setState , mutate } = createReaxable( {} );
   
   // 在 reaxel 内实例化 Refaxel，作为内部能力组件
   const reaxel_Lottie = Refaxel_Lottie( {
      schemes : [
         { name : "dark" as const , segments : [ 19 , 80 ] } ,
         { name : "light" as const , segments : [ 100 , 173 ] } ,
      ] as const ,
      defaultScheme : 'dark' ,
      animationData : lottieJSON ,
   } );
   
   obsReaction( () => {
      document.documentElement.setAttribute( 'theme' , reaxel_Lottie.store.currentScheme );
   } , () => [ reaxel_Lottie.store.currentScheme ] );
   
   const rtn = {
      get theme() { return reaxel_Lottie.store.currentScheme; } ,
      toggleTheme( theme ) { reaxel_Lottie().toggleTo( theme ); } ,
   };
   
   return Object.assign( () => rtn , {
      store , setState , mutate ,
      reaxel_Lottie ,  // 可选：暴露内部实例
   } );
} );
```

### 定义 Refaxel 工厂

当某段 reaxel 逻辑需要以**不同配置多例并存**时，应将其抽象为 Refaxel：

```typescript
// 定义 Refaxel 工厂
export const Refaxel_Counter = ( config: { initial: number , step: number } ) => {
   return reaxel( () => {
      const { store , setState } = createReaxable( { count : config.initial } );
      const rtn = {
         increment() { setState( { count : store.count + config.step } ); } ,
         decrement() { setState( { count : store.count - config.step } ); } ,
      };
      return Object.assign( () => rtn , { store , setState } );
   } );
};

// 多例并存，各自独立
const counterA = Refaxel_Counter( { initial : 0 , step : 1 } );
const counterB = Refaxel_Counter( { initial : 100 , step : 10 } );
counterA.store.count;  // 0
counterB.store.count;  // 100——完全独立
```

### 官方扩展包

| 包名 | 用途 | 说明 |
|------|------|------|
| `refaxel-i18n` | 国际化支持 | Refaxel 多例工厂，支持多实例独立语言管理，提供 `i18n()` 函数和 `createI18nReactComponent` 视图组件 |
| `reaxel-persist` | 状态持久化 | 基于 class 的持久化方案（支持 localStorage/sessionStorage），与 `rehance_BrowserPersist` 是不同实现 |
| `reaxel-time-machine` | 时间旅行调试 | 提供撤销/重做、时间线导航等状态历史管理能力 |

> ChatAIO FloatingView/menubar/窗口鼠标穿透改动还必须阅读 [`menubar-drag-investigation.md`](../../projects/ChatAIO/docs/issues/menubar-drag-investigation.md)；Windows 上禁止启用 `setIgnoreMouseEvents(..., { forward: true })`。
