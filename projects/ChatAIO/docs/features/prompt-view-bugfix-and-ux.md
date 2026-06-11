# PromptView Bug 修复与 UX 改进

## 结论

三个改动点各有独立根因，互不影响：
1. PromptView 展开时无条件关闭 SettingsView，是主进程代码中一条显式 setState 导致的 bug
2. 新建 prompt 追加到列表底部是 addPrompt 实现顺序问题
3. 动画时长和 antd 组件 motion 影响 UI 即时感

## 需求 1: Alt+,/Alt+. 不应关闭 SettingsView

### 现象

App 处于 SettingsView 时，按 Alt+, 或 Alt+. 打开 PromptView，SettingsView 被关闭，中心区域跳到 AI page。

### 根因

reaxel_PromptViews.setPromptViewVisible() 中当 visible=true 时无条件设置 settingsViewOpened=false，导致 SettingsView 被关闭。

### 修复方案

移除 setPromptViewVisible 中对 settingsViewOpened 的强制置 false。PromptView 是侧栏，与中心区域的 SettingsView 或 AI page 没有互斥关系。

### 修改文件

- src/Main/reaxels/Views/Prompt-Views/index.ts

## 需求 2: New Prompt 按钮应将新项添加至顶部

### 现象

点击 New Prompt 按钮后，新 PromptCard 出现在列表底部，用户需滚动才能看到。

### 根因

reaxel_PromptView.addPrompt() 使用 spread 将新项追加到尾部。

### 修复方案

将 createPromptItem() 放在数组最前面。

### 修改文件

- src/Views/PromptView/reaxels/prompt-view/index.ts

## 需求 3: 去掉或缩短 PromptView 中多余动画

### 现象

PromptView 中 CSS transition 和 antd 组件内置 motion 动画导致 UI 反馈有延迟感。

### 修复方案

1. CSS transition duration 从 160ms 缩至 150ms
2. 在 PromptView 的 ConfigProvider 上设置 motion=false，禁用 antd 组件级动画
3. 保留功能性 transition（hover、focus 视觉反馈），仅缩短时长

### 修改文件

- src/Views/PromptView/index.less
- src/Views/PromptView/App.tsx
