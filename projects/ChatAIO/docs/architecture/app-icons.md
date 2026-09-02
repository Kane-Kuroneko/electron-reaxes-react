# App / Tray 图标布局

ChatAIO 的应用图标、托盘图标和母图统一放在 `statics/icons/`。换图走仓库根 [`scripts/replace-app-icons/`](../../../../scripts/replace-app-icons/AGENTS.md)，不要手改 `.ico` / `.icns`。

## 目录

```
projects/ChatAIO/statics/icons/
  app-icon.{ico,icns,png}           # 正式版：Win / macOS / Linux
  app-icon-dev.{ico,icns,png}       # DEV（未打包）
  tray-icon.macos.png               # macOS 托盘 Template 18×18
  tray-icon.macos@2x.png            # macOS 托盘 Template 36×36
  tray-icon-dev.macos.png
  tray-icon-dev.macos@2x.png
  main-icon-900x900.png             # 正式版母图（1024×1024；文件名历史遗留）
  main-icon-900x900-dev.png         # DEV 母图
```

历史名 `gpt*` 已改为 `app-icon*`。旧的 `statics/tray-icon.png`（32×32 残留）和 `engine/index.template.html` 里指向不存在的 `/statics/assets/ico/logo - 32x32.ico` 的 favicon 已删除。

## 不变量

- 运行时按 `!app.isPackaged` 选 `*-dev` 文件名；`electron-builder.yml` 的 `icon:` 始终指向正式版 `statics/icons/app-icon`（无后缀）。
- Windows / Linux 托盘用 `app-icon.png`（再缩到 32px），不用 ICO；macOS 托盘用 `tray-icon.macos.png` + `setTemplateImage(true)`。
- 母图只存在仓库里，供以后裁剪 / 二次生成；**不打进安装包**。`extraResources` 复制整个 `statics/`，但 filter 排除两张 `main-icon-900x900*.png`。
- `getStaticsDir()` 仍指向 `statics/` 根（打包后 `resources/statics`）。图标文件在其子目录 `icons/`。

## 入口

| 用途 | 文件 |
|------|------|
| 路径解析 / Dock / 托盘加载 | [`src/Main/services/app-icons/index.ts`](../../src/Main/services/app-icons/index.ts) |
| 打包 app icon + extraResources | [`electron-builder.yml`](../../electron-builder.yml) |
| Menubar 展示、About 页 | webpack 直接 import `statics/icons/app-icon[-dev].png` |
| 从 PNG 覆盖全套产物 | [`scripts/replace-app-icons/AGENTS.md`](../../../../scripts/replace-app-icons/AGENTS.md) |

## 禁止项

- 不要把手改的 `.ico` / `.icns` 当换图手段；不要把 PNG 改后缀冒充 ICO。
- 不要把母图重新打进 extraResources。
- 不要再往 `statics/` 根目录散放图标。
