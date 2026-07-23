# ChatAIO：菜单栏下方透明拖拽区遮挡内容（Windows）

## 文档状态

- **症状**：menubar **正下方**、内容区**靠左**出现透明矩形；可拖动主窗口，但挡住 AI 页点击。
- **与另一文档区分**：[`menubar-drag-investigation.md`](./menubar-drag-investigation.md) 记录的是 **FloatingView `forward: true` 导致拖动抖动/闪烁**；本文是 **命中测试泄露**，二者可并存、根因不同。
- **状态**：CONFIRMED（2026-07-15 首次；**2026-07-24 用户确认主壳裁剪方案修复成功**）。
- **正式修复（须同时满足，缺一不可）**：
  1. Electron **≥ 41.2.1**（仓库 **41.10.2**，`955e286d1`）—— hidden WCV 的 drag 不再贡献 HTCAPTION（[#51176](https://github.com/electron/electron/issues/51176) / [#51200](https://github.com/electron/electron/pull/51200)）。
  2. **主壳 native View 裁到 menubar 高度**（`clipMainShellToMenuBar`）——避免全窗主壳上的 `app-region: drag` 与内容 WCV 在屏幕坐标叠命中（[#41002](https://github.com/electron/electron/issues/41002) / [#43320](https://github.com/electron/electron/issues/43320)）。
  3. 内容 WCV **禁止 y=0 全窗默认 bounds**；闲置中心 view **removeChildView**（不仅 `setVisible(false)`）。

> **禁止**：为「修幽灵拖区」把 menubar 整栏改成 `no-drag` / 只留 6px 顶条。那只会让**整栏拖不动**，与目标「menubar 可拖 + 内容区不可拖」相反。2026-07-24 曾误用此方案，已回滚。

---

## 1. 症状（如何辨认）

- 位置：自定义 menubar **正下方**，通常从窗口**左缘**起，宽约数十～百余像素（与 menubar 内 drag 区域在垂直方向上的「投影」重合）。
- 表现：
  - 该矩形内按住可**拖动主窗口**（像拖标题栏）。
  - 同一区域**无法点击**下方 AI `WebContentsView` 内的链接、输入框、按钮等。
- 易误判：
  - 不是「整栏 menubar 拖不动」（那是错误修复的副作用）。
  - 不是 FloatingView 抖动（见另一文档）。
  - 不是菜单按钮本身点不到（按钮为 `no-drag`）。

---

## 2. 根因

### 2.1 公开讨论（先查再改）

| 资源 | 要点 |
|------|------|
| [electron#41002](https://github.com/electron/electron/issues/41002) | 底层 BrowserView/WCV 的 `app-region: drag` **无视上层遮挡**，仍截获命中（Windows 确认）。nornagon 复现 gist 同模型。 |
| [electron#43320](https://github.com/electron/electron/issues/43320) | 同坐标下任一 DraggableRegionProvider 有 drag → 该点可拖；官方称属 Chromium hit-test 模型，**仍 open**，不能指望「升级就好」。 |
| [electron#51176](https://github.com/electron/electron/issues/51176) / [#51200](https://github.com/electron/electron/pull/51200) | **hidden** WCV 的 drag 仍生效；41.2.1+ 对不可见 view 返回 `HTNOWHERE`。 |
| [VS Code #310765](https://github.com/microsoft/vscode/issues/310765) | 同源：非活动 editor-browser 里 fullscreen drag 挡住其它 tab；靠上游 #51200 + 应用侧规避。 |

**核心机制**：Electron 非客户区命中（`HTCAPTION`）聚合**所有** drag-region provider，**不按绘制 z-order / 遮挡**决策。主壳若仍是**全 client 高度**的 WebContentsView，其上 menubar 的 `-webkit-app-region: drag` 会继续作为 provider 参与整窗命中 → 内容区左上角出现「幽灵标题栏」。

### 2.2 ChatAIO 触发组合

```text
BrowserWindow（titleBarStyle: hidden + titleBarOverlay）
├── 主壳 WebContentsView ← 只渲染 MainView menubar HTML
│     但默认 native bounds = 全 client 高度   ← 根因
│     CSS: .main-view-bar / drag-tail / badge = drag
└── contentView 子 WebContentsView
      AI / Settings / Prompt（y ≥ menuBarHeight = 36）

内容区某点 (x, y>36)：
  上层 AI WCV → 无 drag → 本应把点击交给页面
  下层主壳 provider → 仍可能把该点判成 HTCAPTION
  → 透明可拖窗 + 挡点击
```

补充放大因子（未裁主壳时更易复现）：

- 内容 WCV 曾默认 `setBounds({ x:0, y:0, width, height })` 全窗，与主壳 drag 在屏幕坐标重叠（#41002 经典场景）。
- Windows 上闲置 AI 只 `setVisible(false)`、不 `removeChildView`，在 #51200 之前会继续贡献命中；之后仍建议 detach，减少 provider 集合。

---

## 3. 正式修复方法

### 3.1 Electron ≥ 41.2.1（底线）

```json
"electron": "^41.10.2"
```

```bash
node -p "require('electron/package.json').version"   # 应 ≥ 41.2.1
```

只解决 **hidden** WCV 一类；**不能**单独解决主壳全窗 + 内容 WCV 叠层。

### 3.2 主壳 View 裁到 menubar（本问题的关键修复）

实现：[`clip-main-shell-to-menubar.utility.ts`](../../src/Main/services/clip-main-shell-to-menubar.utility.ts)

- 在 view 树中查找 `webContents === mainWindow.webContents` 的 `WebContentsView`（含 contentView 兄弟，见 Electron #41256）。
- `setBounds({ x: 0, y: 0, width, height: menuBarHeight })`（`menuBarHeight = 36`）。
- `createMainWindow` 调用 `bindMainShellMenuBarClip`；在 `resize` / `maximize` / `unmaximize` / 全屏进出 / `did-finish-load` / `dom-ready` 重裁；`fitWindow` 时再保险调用一次。

裁剪后：主壳 drag provider 的 native 范围只有 `y ∈ [0, 36)`，**不再覆盖**内容区。

### 3.3 内容 WCV 生命周期

| 点 | 做法 |
|----|------|
| `initWebContentsView` | 先 `setVisible(false)`；无自定义 `refreshBounds` 时也用 `y = menuBarHeight`，**禁止**全窗 `{y:0}` |
| Settings | 显式 `refreshBounds → fitContentView` |
| 闲置中心 view | 全平台 `setVisible(false)` **并** `removeChildView`；mount 时再 `addChildView` |

### 3.4 Menubar CSS（保持可拖，与裁剪正交）

[`MainView/index.less`](../../src/Views/MainView/index.less)：

- **drag**：`.main-view-bar`、`__drag-tail`、`.main-view-context-badge`、macOS `.main-view-traffic-light-spacer`
- **no-drag**：菜单按钮、`__right`、html/body
- **禁止**：`inset: 0` 全栏 drag overlay；为修幽灵区把整栏改成 no-drag

另：FloatingView 保持 `setIgnoreMouseEvents(true, { forward: false })`（见 [`menubar-drag-investigation.md`](./menubar-drag-investigation.md)）。

---

## 4. 应避免的事项（Agent / 开发者必读）

| 不要做 | 为什么 |
|--------|--------|
| 靠「缩小 menubar drag 面」（6px 顶条、去掉 drag-tail）修幽灵区 | 用户要的是**整栏可拖**；砍 drag 只会拖不动，且未从根上拆掉全窗 provider |
| 加回 `inset:0` / 绝对定位全栏 `drag-layer` | 历史上直接把 HTCAPTION 铺到 AI WCV 上 |
| 内容 WCV 默认 `setBounds` 全窗 `y=0` | 与主壳 drag 屏幕重叠，复现 #41002 |
| Windows 闲置中心 view 只 hidden、长期留在 `contentView` | provider 集合膨胀；与 macOS detach 策略不一致 |
| 删掉 `clipMainShellToMenuBar` / 不再在 resize 后重裁 | 最大化、DPI、重载后主壳会回到全窗，幽灵区复发 |
| 认为「已经升到 41.10.2 就永不再发」 | #43320 叠层模型仍在；必须保留应用侧裁剪 |
| 把 FloatingView `forward` 改回 `true` | 另一问题（拖动抖动），见 menubar-drag-investigation |
| 未查公开 issue 就改 menubar drag CSS | 易与 #41002/#43320/#51176 三种根因搅在一起 |

---

## 5. 错误方案复盘（2026-07-24）

曾误判「泄露面积 ∝ drag 面积」，把 `.main-view-bar` / `__drag-tail` 改为 `no-drag`，仅留 6px `::before`。结果：

- menubar **几乎整栏不可拖**（用户明确反对）；
- 未解决主壳全窗 provider 问题。

正确路径：先读 #41002/#43320 → **裁主壳 bounds** → **保留 menubar 空白 drag**。

---

## 6. 回归检查清单

修改 Electron 版本、menubar 样式、WCV 层级/可见性、`titleBarOverlay` 或主壳裁剪后至少验证：

1. Windows：menubar **空白 / drag-tail / badge** 可拖窗。
2. AI 页**左上角**可点链接/输入框，**不应**拖窗。
3. 切换 AI、开/关 Settings、开/关 Prompt 后幽灵区不复发。
4. Dropdown、窗口控制钮正常。
5. FloatingView 同开时 menubar 拖动仍丝滑（`forward: false`）。
6. 最大化 / 还原 / resize 后主壳高度仍为 36，幽灵区不回潮。

---

## 7. 相关文件

- [`clip-main-shell-to-menubar.utility.ts`](../../src/Main/services/clip-main-shell-to-menubar.utility.ts) — 主壳裁剪
- [`mainWindow.ts`](../../src/Main/mainWindow.ts) — `bindMainShellMenuBarClip`
- [`initWebContentsView.ts`](../../src/Main/reaxels/Views/utils/initWebContentsView.ts) — 默认 bounds / 初始 hidden
- [`Views/index.ts`](../../src/Main/reaxels/Views/index.ts) — detach + `fitWindow` 重裁
- [`Settings-View/index.ts`](../../src/Main/reaxels/Views/Settings-View/index.ts) — Settings `refreshBounds`
- [`MainView/index.less`](../../src/Views/MainView/index.less) — menubar drag 约定
- 根 [`package.json`](../../../../package.json) — `electron` 版本

---

## 8. 关联文档

- [menubar-drag-investigation.md](./menubar-drag-investigation.md) — FloatingView mouse forwarding
- [custom-menu-view-prd.md](../architecture/custom-menu-view-prd.md) — menubar 产品与 `app-region` 约定
- [menubar-platform-paths.md](../architecture/menubar-platform-paths.md) — 平台渲染路径
