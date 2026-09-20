# SettingsView 退出与 PromptView 滚动条

两项相互独立。**运行设置即时写盘之后，关窗不再丢主题 / 代理**；AI 表草稿仍不随关窗丢弃。换皮见 [`settings-ui-shadcn.md`](./settings-ui-shadcn.md)。

## 需求 1: 关 Settings 保留已写盘的 runtime，以及未保存的 AI 表草稿

### 现行行为

页脚是 **Done**（或关窗），调用 `exitSettings()`：

1. **Runtime（主题、语言、代理、GPU、Startup AI Page）已经在控件变更时 `persistRuntimeSettings`。** Done 不再 Discard，再次进入应看到刚改的值。
2. **Manage AIs 表内未保存的 Enabled / 删除草稿会保留**（页脚不碰表 dirty）。要丢掉表草稿用表底 **Undo Changes**。见 [`manage-ais-save-scopes.md`](./manage-ais-save-scopes.md)。
3. GPU 等 `restartRequired` 在写盘当时 Dialog 提示，不拖到退出。

历史上 **Exit Without Save / Discard Changes** 会 `reloadRuntimeSettings` 再关窗，用来丢掉未 Apply 的 runtime 草稿。那套页脚已去掉。`exitWithoutSave()` 仍留在 reaxel 里，UI 不再绑。

E2E：[`e2e/tests/settings-exit-without-save.spec.ts`](../../e2e/tests/settings-exit-without-save.spec.ts)（点 Done：主题已落盘，Enabled 草稿仍在）。

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
