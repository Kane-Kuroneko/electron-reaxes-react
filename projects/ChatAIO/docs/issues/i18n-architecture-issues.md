# I18n 架构问题分析与修复

> 归纳了 ChatAIO i18n 功能中发现的所有问题、根因链条、以及修复方案。

---

## 问题 1：主进程 i18n 完全不生效

**症状**：Menu/Tray/Dialog 始终显示英文

**根因链条**：

```
const menu = reaxel_Menu()     // menu = rtn (普通对象)
menu().setI18nInstance(i18n)   // ← TypeError: menu is not a function
      ↓
整个 async 函数抛出异常，被 .catch() 静默吞掉
      ↓
后续代码全部跳过，包括 language-change IPC handler 注册
      ↓
渲染进程发送 language-change 时，registry['language-change'] === undefined
```

**修复**：

```typescript
// ✅ 正确 - 每次通过 reaxel 获取 rtn 后直接调用方法
reaxel_Menu().setI18nInstance(...)
reaxel_Menu().rebuildMenu()
```

---

## 问题 2：主进程 i18n 启动时始终为 en-US

**根因**：`reaxel_I18n` 初始化时硬编码 `language: 'en-US'`，从未从持久化的 `user-settings.json` 读取。

**修复**：初始化时从 `getSettingsConfigService().getEffectiveSettings().appearance.language` 读取。

---

## 问题 3：setI18nInstance 传参类型不匹配

**根因**：Menu/Tray 的 `t()` 函数需要 `i18nInstance` 是可调用的（调用后返回含 `.i18n` 方法的对象）。

**修复**：传递 `reaxel_I18n`（reaxel 引用本身），不是 `reaxel_I18n()`（rtn 对象）。

---

## 问题 4：渲染进程 i18n 与 settings 不一致

**根因**：
- `rehance_I18n_Persist` 将语言存在 `localStorage`
- Settings 将语言存在 `user-settings.json`
- 两个存储互相独立，容易不同步

**修复**：Electron 模式下禁用 localStorage 持久化，统一以 `user-settings.json` 为单一数据源。

---

## 问题 5：渲染进程启动时未同步 i18n 语言

**根因**：`reaxel_SettingsView` 在 `setSettings()` 中更新了 `UIControls.appearance.language`，但从未调用 `reaxel_I18n().setLanguage()` 来实际切换。

**修复**：在 `setSettings()` 中加入 `reaxel_I18n().setLanguage(settings.appearance.language)` 同步调用。

---

## 涉及的文件

| 文件 | 修改内容 |
|------|----------|
| `src/Main/reaxels/I18n/index.ts` | 启动时从 settings 读取持久化语言并加载资源 |
| `src/Main/when-ready.ts` | 修复 reaxel 调用模式 + setI18nInstance 传参 |
| `src/Main/reaxels/Settings/index.ts` | applySettings 中防御性同步 i18n 语言 |
| `src/Views/SettingsView/reaxels/i18n/index.ts` | Electron 模式禁用 localStorage 持久化 |
| `src/Views/SettingsView/reaxels/settings-view/index.ts` | setSettings 中同步 i18n 语言 |
| `src/Views/SettingsView/components/Appearance/index.tsx` | 简化调用 |

---

## Code Review 检查清单

- [ ] reaxel 返回值是否被错误地当作函数调用？
- [ ] `setI18nInstance` 是否传递的是 reaxel 引用而非调用结果？
- [ ] 主进程 i18n 是否从持久化 settings 读取初始语言？
- [ ] 渲染进程在获取 settings 后是否同步了 i18n？
- [ ] Electron 模式是否避免了 localStorage 与 settings 的双重持久化？
