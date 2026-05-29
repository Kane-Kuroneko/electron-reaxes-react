# I18n 功能修复说明

## 发现的问题

1. **SettingsView UI 没有使用 `<I18n>` 组件**
   - 所有需要翻译的文本都是硬编码的字符串
   - 没有用 `<I18n>文本</I18n>` 包裹

2. **主进程 Menu 翻译可能未生效**
   - 语言文件加载方式使用了错误的路径
   - 应该预加载而不是动态加载

3. **语言变更时的同步机制**
   - 需要确保 Renderer 和 Main 进程的语言状态同步

## 修复内容

### 1. SettingsView App.tsx
- ✅ 所有按钮文本使用 `<I18n>` 组件包裹
  - "Exit Without Sumbit"
  - "Discard All Changes"
  - "Apply"
  - "Save All"
- ✅ 侧边栏菜单项使用 `<I18n>` 动态翻译
- ✅ 对话框文本使用 `<I18n>` 组件

### 2. 主进程 I18n 模块
- ✅ 改为预加载所有语言文件（zh-CN, zh-TW, ja-JP, ko-KR）
- ✅ 移除异步加载逻辑，改为同步加载
- ✅ 直接从 import 的资源对象中读取翻译

### 3. 语言变更同步
- ✅ Renderer 切换语言时调用 `api.languageChange()`
- ✅ 主进程监听 `language-change` 事件
- ✅ 主进程更新自身 i18n 状态
- ✅ 主进程重建 Menu 和 Tray

## 测试步骤

### 测试 1: SettingsView UI 翻译
1. 启动应用
2. 打开 Settings (Application > Settings)
3. 进入 Appearance 面板
4. 切换语言（English → 简体中文 → 日本語 等）
5. **预期结果**：
   - 侧边栏菜单项立即翻译
   - 底部按钮文本立即翻译
   - 语言选择器选项保持原样（因为它们是语言名称）

### 测试 2: 主菜单翻译
1. 在 Settings 中切换语言
2. 关闭 Settings
3. 点击主菜单（Application, View, Switch AI）
4. **预期结果**：
   - 菜单项标签显示为当前语言
   - 子菜单项也正确翻译

### 测试 3: 托盘菜单翻译
1. 确保托盘已启用（System 设置中）
2. 在 Settings 中切换语言
3. 右键点击托盘图标
4. **预期结果**：
   - 托盘菜单项显示为当前语言
   - "Show Window" 和 "Quit" 正确翻译

### 测试 4: 语言持久化
1. 切换语言为简体中文
2. 关闭应用
3. 重新启动应用
4. **预期结果**：
   - 应用启动时自动使用上次选择的语言
   - UI 和菜单都显示为简体中文

### 测试 5: 所有 5 种语言
测试以下语言的翻译是否完整：
- ✅ en-US (English) - 源语言
- ✅ zh-CN (简体中文)
- ✅ zh-TW (正體中文)
- ✅ ja-JP (日本語)
- ✅ ko-KR (한국어)

## 翻译覆盖范围

### 主菜单 (Main Menu)
- Application > Settings
- Application > Check for Updates
- View > Reload
- View > Force Reload
- View > Developer Tools
- View > Wipe and Reload This Page
- View > Zoom In
- Switch AI > No enabled AI pages

### 托盘菜单 (Tray Menu)
- Show Window
- Quit

### SettingsView
- 侧边栏菜单：Networks, Appearance, Manage AIs, System
- 底部按钮：Exit Without Sumbit, Discard All Changes, Apply, Save All
- 对话框：Restart required 等

## 已知问题

1. **Appearance 面板中的表单标签**
   - "Language", "Dark Mode" 等标签尚未翻译
   - 这些是表单控件的 label，需要额外处理

2. **Manage AIs 面板**
   - 面板内的文本尚未完全翻译

3. **Network 和 System 面板**
   - 面板内的文本尚未完全翻译

## 后续优化建议

1. 为所有 SettingsView 组件添加完整的 `<I18n>` 包裹
2. 添加更多翻译键值（对话框消息、错误提示等）
3. 考虑添加语言切换时的加载状态提示
4. 优化语言文件加载策略（按需加载 vs 预加载）
