# SettingsView 退出丢弃与 PromptView 滚动条优化

## 结论

两项改动相互独立：

1. **SettingsView「Exit Without Save」** 应在关闭前丢弃内存中的未保存编辑，与「Discard Changes」语义一致并额外退出。
2. **PromptView 纵向滚动条** 仅改 CSS，使滚动条更细、更淡，并尽量浮于内容区而非挤占列表宽度。

## 需求 1: Exit Without Save 应重置未保存配置

### 现象

用户在 SettingsView 中修改设置后点击 **Exit Without Save** 退出，再次进入时仍看到上次未保存的修改；退出什么样进来还是什么样。

### 期望行为

点击 **Exit Without Save** 时：

1. 丢弃当前会话内所有未 Apply/Save 的 UI 编辑（与 **Discard Changes** 相同的数据源：磁盘上的 `user-settings.json`）。
2. 恢复主题/语言等对 PromptView 的预览副作用（`setSettings` 会重新 `previewPromptViewAppearance`）。
3. 关闭 SettingsView。

### 根因

`App.tsx` 中 **Exit Without Save** 仅调用 `exitSettings()` IPC，未调用 `reloadSettings()`。SettingsView 的 reaxel 状态在窗口隐藏后仍驻留内存，再次打开时直接复用脏状态。

**Discard Changes** 已正确调用 `reloadSettings()`，但 **Exit Without Save** 遗漏了这一步。

### 修复方案

在 `reaxel_SettingsView` 中新增 `exitWithoutSave()`：

```ts
async function exitWithoutSave() {
   await reloadSettings();
   exitSettings();
}
```

`App.tsx` 将 **Exit Without Save** 的 `onClick` 改为 `await exitWithoutSave()`。

不新增 IPC；复用现有 `fetch-settings` + `exit-settings`。

### 修改文件

- `src/Views/SettingsView/reaxels/settings-view/index.ts`
- `src/Views/SettingsView/App.tsx`

### 验收标准

- 修改任意设置项（如主题、语言、代理模式）后不 Apply/Save，点 **Exit Without Save**，再次进入应显示磁盘持久化值。
- 修改主题/语言后 **Exit Without Save**，PromptView 外观应恢复为已保存配置，而非预览值。
- **Discard Changes**、**Apply**、**Save & Exit** 行为不变。
- `reloadSettings` 失败时记录错误；仍执行 `exitSettings()`（用户意图是离开，与脏数据滞留相比更可接受）。

---

## 需求 2: PromptView 纵向滚动条美化

### 现象

`.prompt-view-body` 使用浏览器默认滚动条：较宽、颜色偏重，出现时会占用内容区右侧宽度，与 PromptView 极简视觉不一致。

### 期望行为

- 滚动条更细（约 5–6px 可感知宽度）。
- 轨道透明，滑块颜色更淡，hover 时略加深。
- 尽量浮于内容 padding 区域，不明显挤压 prompt 卡片列表宽度。
- Light / Dark 主题均适配，沿用现有 `--prompt-*` design tokens。

### 调研结论

| 来源 | 做法 |
|------|------|
| [shadcn/ui #1815](https://github.com/shadcn-ui/ui/issues/1815) | `::-webkit-scrollbar` + 透明 track + `rounded-full` thumb + `border: transparent` + `background-clip: padding-box` 实现细滑块 |
| [VS Code scrollbars.css](https://github.com/microsoft/vscode/blob/main/src/vs/base/browser/ui/scrollbar/media/scrollbars.css) | 透明 track、低饱和 thumb、hover/active 分级 |
| [Chromium scrollbar styling](https://developer.chrome.com/docs/css-ui/scrollbar-styling) | Electron 41 (Chromium 130+) 若同时设置 `scrollbar-color` 与 `::-webkit-scrollbar` 会互斥；本工程仅用 WebKit 伪元素以保证细粒度样式 |

不引入 Radix ScrollArea 或第三方滚动库：PromptView 列表区已是原生 `overflow: auto`，CSS 即可满足。

### 技术方案

在 `index.less` 的 `:root` / dark 主题中增加：

- `--prompt-scrollbar-thumb`
- `--prompt-scrollbar-thumb-hover`

为 `.prompt-view-body` 增加：

```less
&::-webkit-scrollbar { width: 6px; }
&::-webkit-scrollbar-track { background: transparent; }
&::-webkit-scrollbar-thumb {
   background-color: var(--prompt-scrollbar-thumb);
   border-radius: 999px;
   border: 2px solid transparent;
   background-clip: padding-box;
}
&::-webkit-scrollbar-thumb:hover {
   background-color: var(--prompt-scrollbar-thumb-hover);
}
```

将 `overflow: auto` 收窄为 `overflow-y: auto; overflow-x: hidden`，避免水平滚动条干扰窄侧栏。

### 修改文件

- `src/Views/PromptView/index.less`

### 非目标

- 不改 PromptView 组件结构或 IPC。
- 不实现 VS Code 式 JS 自定义滚动条（复杂度过高）。
- 不修改 SettingsView 或其他视图的滚动条（本次仅 PromptView body）。

### 验收标准

- 列表可滚动时滚动条明显细于系统默认。
- 轨道透明，thumb 颜色弱于正文，hover 有轻微反馈。
- 260px–380px 侧栏宽度下卡片不被明显挤窄。
- Light/Dark 主题下对比度可读。
