# I18N 架构问题归纳与正确方案

> 本文档归纳了 AI-WebApp i18n 功能中发现的所有问题、根因链条、以及修复后的正确架构方案。

---

## 一、问题清单

### 问题 1：主进程 i18n 完全不生效（Menu/Tray/Dialog 始终显示英文）

**根因链条：**

```
const menu = reaxel_Menu()     // menu = rtn (普通对象)
menu().setI18nInstance(i18n)   // ← TypeError: menu is not a function
      ↓
整个 async 函数抛出异常，被 .catch() 静默吞掉
      ↓
后续代码全部跳过，包括 language-change IPC handler 注册
      ↓
渲染进程发送 language-change 时，registry['language-change'] === undefined
      ↓
undefined.forEach(...) → 报错
```

**核心误解：** `reaxel_Menu()` 返回的是 `rtn`（普通对象），**不是可调用函数**。不能写：
```typescript
// ❌ 错误
const menu = reaxel_Menu();
menu().setI18nInstance(...)
menu().rebuildMenu()

// ✅ 正确 - 每次通过 reaxel 获取 rtn 后直接调用方法
reaxel_Menu().setI18nInstance(...)
reaxel_Menu().rebuildMenu()
```

---

### 问题 2：主进程 i18n 启动时始终为 en-US

**根因：** `reaxel_I18n` 初始化时硬编码 `language: 'en-US'`，从未从持久化的 `user-settings.json` 读取。

**修复：** 初始化时从 `getSettingsConfigService().getEffectiveSettings().appearance.language` 读取。

---

### 问题 3：setI18nInstance 传参类型不匹配

**背景：** Menu 和 Tray 的 `t()` 函数签名为：
```typescript
const t = (text: string) => {
   return i18nInstance ? i18nInstance().i18n(text) : text;
};
```

需要 `i18nInstance` 是**可调用的**，调用后返回含 `.i18n` 方法的对象。

**正确传参：** 传递 `reaxel_I18n`（reaxel 引用本身），**不是** `reaxel_I18n()`（rtn 对象）：
```typescript
// ✅ reaxel_I18n 本身是 Object.assign(() => rtn, {...})，是可调用的
// i18nInstance() → 调用 reaxel_I18n() → 返回 rtn → rtn.i18n(text) ✓
reaxel_Menu().setI18nInstance(reaxel_I18n);

// ❌ reaxel_I18n() 返回 rtn (普通对象)，rtn() 会 TypeError
reaxel_Menu().setI18nInstance(reaxel_I18n());
```

---

### 问题 4：渲染进程 i18n 与 settings 不一致

**根因：**
- `rehance_I18n_Persist` 将语言存在 `localStorage`
- Settings 将语言存在 `user-settings.json`
- 两个存储互相独立，容易不同步

**修复：** Electron 模式下禁用 localStorage 持久化，统一以 `user-settings.json` 为单一数据源。

---

### 问题 5：渲染进程启动时未同步 i18n 语言

**根因：** `reaxel_SettingsView` 在 `setSettings()` 中更新了 `UIControls.appearance.language`，但从未调用 `reaxel_I18n().setLanguage()` 来实际切换渲染进程的 i18n 模块。

**修复：** 在 `setSettings()` 中加入 `reaxel_I18n().setLanguage(settings.appearance.language)` 同步调用。

---

## 二、正确的 i18n 架构方案

### 2.1 单一数据源

```
user-settings.json → appearance.language (唯一的语言持久化位置)
```

### 2.2 启动流程

```
┌─────────────────────────────────────────────────────────┐
│ Main Process                                            │
│                                                         │
│ 1. reaxel_I18n 初始化                                   │
│    └→ 从 user-settings.json 读取 appearance.language    │
│    └→ 加载对应语言资源 (languageMaps)                    │
│                                                         │
│ 2. setI18nInstance(reaxel_I18n) 注入到 Menu / Tray      │
│    └→ Menu.createMenu() 中 t() 使用正确语言翻译         │
│                                                         │
│ 3. 注册 'language-change' IPC handler                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Renderer Process (SettingsView)                         │
│                                                         │
│ 1. reaxel_I18n 初始化 (Electron模式不用localStorage)     │
│    └→ 默认 sourceLanguage: en-US                        │
│                                                         │
│ 2. reaxel_SettingsView → loadSettingsOnStartup()        │
│    └→ IPC: fetch-settings → 获取 settings               │
│    └→ setSettings() 中同步: reaxel_I18n().setLanguage() │
│                                                         │
│ 结果: 渲染进程 i18n 与持久化设置保持一致                   │
└─────────────────────────────────────────────────────────┘
```

### 2.3 运行时语言切换流程

```
用户在 Appearance 面板选择新语言
         │
         ├─→ ① setState({ language: value })  // 更新 UI 控件状态
         │
         ├─→ ② reaxel_I18n().setLanguage(value)  // 渲染进程 i18n 立即切换
         │
         └─→ ③ api.languageChange(value)  // IPC 通知主进程
                    │
                    ↓
         Main: useIpcRendererToMain('language-change').on(...)
                    │
                    ├─→ reaxel_I18n().setLanguage(lang)  // 主进程 i18n 切换
                    ├─→ reaxel_Menu().rebuildMenu()       // 重建菜单
                    └─→ updateTrayMenu()                  // 更新托盘菜单
```

### 2.4 Apply/Save 持久化流程

```
用户点击 Apply
    │
    └→ applySettings(buildSettingsFromStore())
         │
         └→ Main: settingsConfigService.saveSettings(...)
              └→ 写入 user-settings.json（下次启动时生效）
              └→ reaxel_I18n().setLanguage(...)  // 防御性同步
```

---

## 三、关键规则（Reaxel 使用模式）

### 规则 1: reaxel 返回值模式

```typescript
export const reaxel_Something = reaxel(() => {
   const { store, setState, mutate } = createReaxable({...});
   
   const rtn = { method1, method2, ... };
   
   return Object.assign(() => rtn, { store, setState, mutate });
});
```

- `reaxel_Something` — reaxel 引用本身，**可调用**，调用返回 `rtn`
- `reaxel_Something()` — 返回 `rtn`（普通对象）
- `reaxel_Something.store` — 直接访问 store

### 规则 2: 正确的使用方式

```typescript
// ✅ 调用方法
reaxel_Something().method1();

// ✅ 访问 store
reaxel_Something.store.someField;

// ✅ 传递 reaxel 引用（当目标需要可调用的函数时）
someModule.setInstance(reaxel_Something);

// ❌ 绝对禁止: 存储返回值后再调用
const thing = reaxel_Something();  // thing = rtn (对象)
thing().method1();  // TypeError: thing is not a function
```

### 规则 3: setI18nInstance 传参规则

- Menu/Tray 的 `t()` 需要 `i18nInstance().i18n(text)` 模式
- 必须传递 **reaxel 引用**（可调用），而非 `reaxel()` 的返回值

---

## 四、涉及的文件（修改记录）

| 文件 | 修改内容 |
|------|----------|
| `src/Main/reaxels/I18n/index.ts` | 启动时从 settings 读取持久化语言并加载资源 |
| `src/Main/when-ready.ts` | 修复 reaxel 调用模式 + setI18nInstance 传参 |
| `src/Main/reaxels/Settings/index.ts` | applySettings 中防御性同步 i18n 语言 |
| `src/Views/SettingsView/reaxels/i18n/index.ts` | Electron 模式禁用 localStorage 持久化 |
| `src/Views/SettingsView/reaxels/settings-view/index.ts` | setSettings 中同步 i18n 语言 |
| `src/Views/SettingsView/components/Appearance/index.tsx` | 使用全局 api 类型、简化调用 |

---

## 五、检查清单（Code Review 时使用）

- [ ] reaxel 返回值是否被错误地当作函数调用？(`const x = reaxel_X(); x()` ← 禁止)
- [ ] `setI18nInstance` 是否传递的是 reaxel 引用而非调用结果？
- [ ] 主进程 i18n 是否从持久化 settings 读取初始语言？
- [ ] 渲染进程在获取 settings 后是否同步了 i18n？
- [ ] Electron 模式是否避免了 localStorage 与 settings 的双重持久化？
- [ ] `.catch()` 吞掉的错误是否可能隐藏了初始化失败？
