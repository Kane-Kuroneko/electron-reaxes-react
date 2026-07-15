# ChatAIO：菜单栏下方透明拖拽区遮挡内容（Windows）

## 文档状态

- **症状**：menubar **下方**、内容区**左上角**出现透明矩形；可拖动主窗口，但挡住 AI 页点击。
- **与另一文档区分**：[`menubar-drag-investigation.md`](./menubar-drag-investigation.md) 记录的是 **FloatingView `forward: true` 导致拖动抖动/闪烁**；本文是 **命中测试泄露**，二者可并存、根因不同。
- **状态**：CONFIRMED（2026-07-15，用户验证修复）。
- **正式修复**：升级 Electron 至 **≥ 41.2.1**（仓库提交 `955e286d1` 使用 **41.10.2**）。

---

## 1. 症状（如何辨认）

- 位置：自定义 menubar **正下方**，通常从窗口**左缘**开始，宽约数十～百余像素（与 menubar 内 `-webkit-app-region: drag` 区域在屏幕上的投影重合）。
- 表现：
  - 鼠标按住可**拖动主窗口**（像拖标题栏）。
  - 同一区域**无法点击**下方 AI `WebContentsView` 内的链接、按钮等。
- 易误判：
  - 不是 menubar 菜单项本身点不到（菜单按钮是 `no-drag`，一般可点）。
  - 不是 FloatingView 抖动问题（见另一文档）。
  - 仅收紧 CSS（`html/body` 高度、`pointer-events`）可能**缩小**泄露区，但在 Electron 41.0.3 上**无法根治**。

---

## 2. 根因（上游 Electron）

Windows 上，子 `WebContentsView` 内声明的 `-webkit-app-region: drag` 会参与父窗口的非客户区（**HTCAPTION**）命中测试。在受影响版本中，即使该 view：

- 已 `setVisible(false)`，或
- 高度已限制在 menubar（例如 36px），且 AI 内容在 `y = menuBarHeight` 的子 view 中，

**仍可能在屏幕对应坐标保留“可拖拽”命中**，导致内容区左上角被“幽灵标题栏”占用。

| 资源 | 说明 |
|------|------|
| [electron#51176](https://github.com/electron/electron/issues/51176) | 复现：hidden view 内 `app-region: drag` 仍拖窗 |
| [electron#51200](https://github.com/electron/electron/pull/51200) | 修复：view 不可见时 hit-test 返回 `HTNOWHERE` |
| [electron#51246](https://github.com/electron/electron/pull/51246) | backport 至 **41-x-y**（随 **41.2.1** 发布） |

ChatAIO 在 **Electron 41.0.3** 上稳定复现；升级至 **41.10.2** 后用户确认消失。

> **旁注**：Cursor IDE 等 Electron 应用若在 Windows 上使用多层 view + 自定义标题栏，也可能出现同类“透明挡点击 + 可拖窗”现象，需等上游 Electron/Chromium 修复或应用侧规避 `app-region` 拖拽。

---

## 3. 架构背景（ChatAIO）

```text
BrowserWindow (titleBarStyle: hidden + titleBarOverlay on Windows)
├── mainWindow.webContents  → MainView HTML（menubar，含 -webkit-app-region: drag）
└── contentView 子 WebContentsView
    ├── MainView / AI / Settings / Prompt …（y 偏移 menuBarHeight）
    └── FloatingView（独立问题见 menubar-drag-investigation.md）
```

menubar 相关样式见 [`index.less`](../../src/Views/MainView/index.less)（`.main-view-bar`、`.main-view-bar__drag-tail`、`.main-view-context-badge` 等 `drag` 区域）。

---

## 4. 已尝试但无效或不必保留的规避（勿再重复投入）

以下在 41.0.3 上**未根治**，已在升级 Electron 前回退，**不要**在无新证据时重新引入：

| 方案 | 结果 |
|------|------|
| 仅 CSS：锁 `html/body` 高度、`pointer-events: none` | 泄露区可能缩小，仍存在 |
| 去掉 `.main-view-bar` 整栏 `drag`，只留 tail/badge | 仍存在 |
| MainView 迁到独立 `WebContentsView` + `about:blank` 主壳 | 仍存在 |
| `BrowserWindow` → `BaseWindow` 去掉主 `webContents` | 仍存在 |
| 移除全部 `app-region: drag`，改 IPC + `setPosition` 手拖 | 仍存在 |
| 任意组合上述 | 仍存在 |

**结论**：在 41.0.3 上这是 **Electron 平台 bug**，应用层绕路成本高且不可靠；优先保证 **Electron ≥ 41.2.1**。

---

## 5. 正式解决方案

### 5.1 升级 Electron（必须）

根 `package.json`：

```json
"electron": "^41.10.2"
```

安装后确认版本：

```bash
node -p "require('electron/package.json').version"
```

应 **≥ 41.2.1**。提交参考：`955e286d1`。

同步关注：`@electron/rebuild`、`electron-builder` 与新版 Electron 匹配；`yarn install` 后需成功执行根目录 `postinstall`（`electron-rebuild`）。

### 5.2 保留的既有约束（与本文叠加）

- Windows 上 FloatingView 保持 `setIgnoreMouseEvents(true, { forward: false })`（见 [`menubar-drag-investigation.md`](./menubar-drag-investigation.md)）。
- menubar 布局与 `no-drag` 挖洞逻辑保持 PRD：按钮可点、空白区可拖窗。

### 5.3 降级或 pin 旧 Electron 时

- **禁止**在无完整回归前 pin 到 **&lt; 41.2.1**。
- 若必须停留旧版，需接受本 bug 可能复发，并重新评估架构（例如完全不用 `app-region: drag` + 手拖，且仍可能受 `titleBarOverlay` 影响）。

---

## 6. 回归检查清单

修改 **Electron 版本**、**menubar 样式**、**WebContentsView 层级/可见性** 或 **titleBarOverlay** 后：

1. Windows：AI 页**左上角**点击（链接、输入框、按钮）是否正常。
2. 同一区域**不应**在单击时拖动窗口（除非故意点在 menubar 的 drag 区）。
3. menubar 空白区、品牌 badge、drag-tail 仍可拖窗。
4. 菜单展开/收起、Dropdown、窗口控制按钮正常。
5. 切换/隐藏 AI 页后，泄露区不随隐藏页“复活”（这是 #51200 的核心场景）。
6. 与 FloatingView 同开时拖动仍丝滑（`forward: false`）。

---

## 7. 相关文件

- [`projects/ChatAIO/src/Views/MainView/index.less`](../../src/Views/MainView/index.less)
- [`projects/ChatAIO/src/Main/mainWindow.ts`](../../src/Main/mainWindow.ts)
- [`projects/ChatAIO/src/Main/reaxels/Views/Main-View/index.ts`](../../src/Main/reaxels/Views/Main-View/index.ts)
- [`projects/ChatAIO/src/Main/reaxels/Views/utils/initWebContentsView.ts`](../../src/Main/reaxels/Views/utils/initWebContentsView.ts)
- 根目录 [`package.json`](../../../../package.json)（`electron` 版本）

---

## 8. 关联文档

- [menubar-drag-investigation.md](./menubar-drag-investigation.md) — FloatingView mouse forwarding 与拖动抖动
- [custom-menu-view-prd.md](../architecture/custom-menu-view-prd.md) — menubar 产品与 `app-region` 约定
