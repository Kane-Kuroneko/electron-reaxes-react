# I18n 调试指南

## 问题描述
切换语言后，主进程的 Menu 没有改变。

## 已添加的调试日志

### 1. Renderer 进程 (Appearance 组件)
- `[Appearance] Language changing to:` - 语言切换触发
- `[Appearance] Calling api.languageChange` - 调用 IPC API
- `[Appearance] api.languageChange not available` - API 不可用（错误）
- `[Appearance] Updating renderer i18n` - 更新渲染进程 i18n

### 2. 主进程 (when-ready.ts)
- `[I18n] Registering language-change listener` - 注册监听器
- `[I18n] Language changed to:` - 收到语言变更事件
- `[I18n] Current i18n instance:` - i18n 实例状态
- `[I18n] After setLanguage, current language:` - 设置后的语言
- `[I18n] Rebuilding menu...` - 重建菜单
- `[I18n] Updating tray menu...` - 更新托盘菜单

### 3. 主进程 Menu 模块
- `[Menu] Setting i18n instance` - 设置 i18n 实例
- `[Menu] t('text') => 'result', i18nInstance: true/false` - 翻译调用

### 4. 主进程 I18n 模块
- `[I18n] Loading language: lang` - 加载语言
- `[I18n] Language lang loaded, X translations` - 加载成功
- `[I18n] i18n('text') => 'result' (lang: lang)` - 翻译结果
- `[I18n] Missing translation for 'text' in lang` - 缺少翻译

## 调试步骤

### 步骤 1: 检查 Renderer 进程
1. 打开 SettingsView 的开发工具
2. 切换到 Appearance 面板
3. 切换语言
4. **检查控制台**：
   - 是否看到 `[Appearance] Language changing to:`
   - 是否看到 `[Appearance] Calling api.languageChange`
   - 如果看到 `api.languageChange not available`，说明 API 没有正确暴露

### 步骤 2: 检查主进程
1. 查看主进程控制台（启动应用的终端）
2. **检查日志顺序**：
   ```
   [I18n] Registering language-change listener  ← 启动时
   [I18n] Language changed to: zh-CN            ← 切换语言时
   [I18n] Current i18n instance: ...
   [I18n] Loading language: zh-CN
   [I18n] Language zh-CN loaded, X translations
   [I18n] After setLanguage, current language: zh-CN
   [I18n] Rebuilding menu...
   [Menu] t('Application') => '应用程序', i18nInstance: true
   [Menu] t('Settings') => '设置', i18nInstance: true
   ...
   ```

### 步骤 3: 诊断问题

#### 问题 A: 主进程没有收到语言变更事件
**症状**：没有看到 `[I18n] Language changed to:` 日志

**可能原因**：
1. Renderer 的 `api.languageChange` 不可用
2. IPC 通道没有正确注册
3. `language-change` 没有在 IpcSchema 中定义

**解决方案**：
1. 检查 `preload.ts` 中是否导出了 `languageChange`
2. 检查 `IpcSchema.d.ts` 中是否定义了 `'language-change'`
3. 检查 `api` 是否正确暴露到 `window`

#### 问题 B: 收到事件但 Menu 没有更新
**症状**：看到 `[I18n] Language changed to:` 但菜单仍然是英文

**可能原因**：
1. `i18nInstance` 没有正确设置到 Menu 模块
2. `languageMaps` 没有正确加载
3. `rebuildMenu()` 没有调用 `createMenu()`

**解决方案**：
1. 检查 `[Menu] Setting i18n instance` 是否出现
2. 检查 `[Menu] t('Application')` 的 `i18nInstance` 是 true 还是 false
3. 如果 `i18nInstance: false`，说明 `setI18nInstance` 没有被调用

#### 问题 C: 翻译返回错误
**症状**：看到 `ERR_I18N_MISS_zh-CN(Application)` 

**可能原因**：
1. 语言文件没有正确 import
2. 翻译键值不匹配
3. `languageMaps` 为空

**解决方案**：
1. 检查 `[I18n] Language zh-CN loaded, X translations` 中的 X 是否 > 0
2. 检查语言文件中是否有 `"Application": "应用程序"` 键值对
3. 检查键值是否完全匹配（包括空格和大小写）

## 常见问题

### Q1: 为什么设置语言后需要 rebuildMenu？
**A**: Electron 的 Menu 是一次性构建的，改变 i18n 状态不会自动更新已创建的菜单。必须调用 `rebuildMenu()` 重新创建整个菜单。

### Q2: 为什么有时看到 i18nInstance: false？
**A**: 这说明 `menu().setI18nInstance(i18n)` 没有被调用，或者在 `createMenu()` 执行时 i18n 实例还没有设置。检查 `when-ready.ts` 中的初始化顺序。

### Q3: 语言文件加载了但翻译仍然失败？
**A**: 检查翻译键值是否完全匹配。`"Application"` 和 `"application"` 是不同的键。

## 快速测试

运行以下命令启动应用并查看日志：

```bash
# 在终端中启动
yarn dev

# 观察主进程日志
# 然后在 Settings 中切换语言
# 查看是否出现完整的日志链
```

## 修复清单

- [x] 添加 Renderer 端调试日志
- [x] 添加主进程 IPC 监听器日志
- [x] 添加 Menu 翻译函数日志
- [x] 添加 I18n 模块日志
- [ ] 根据日志输出定位问题
- [ ] 修复具体问题
- [ ] 移除调试日志（生产环境）
