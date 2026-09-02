# replace-app-icons — Agent 操作手册

> **给 Agent 的一句话**：用户要换 Electron 应用图标时，用本脚本从一张 PNG 生成并覆盖目标子工程的全部平台图标；**禁止直接手改 `.ico` / `.icns`，禁止修改用户提供的原始 PNG。**

| 项 | 值 |
|----|----|
| 脚本 | [`replace-app-icons.py`](./replace-app-icons.py) |
| Monorepo 根相对路径 | `scripts/replace-app-icons/replace-app-icons.py` |
| 默认目标工程 | `ChatAIO` → `projects/ChatAIO/` |
| 依赖 | Python 3 + Pillow（`python -m pip install pillow`） |

---

## 何时调用（Triggers）

在以下用户意图出现时 **立即读取本文件并执行脚本**，不要自己用 ImageMagick / 在线工具 / 手写二进制：

- 「替换 / 更换 / 更新 app icon / 应用图标 / tray 图标」
- 「用这张 PNG 生成 electron 图标」
- 提供了一张桌面/绝对路径的 PNG，并要求覆盖 Windows + macOS（+ Linux）图标

若用户只问「图标规格是什么」而未要求生成：回答规格即可，不必跑脚本。

---

## 标准调用（必读）

在 **monorepo 根**（`electron-reaxes-react/`）执行：

```bash
python scripts/replace-app-icons/replace-app-icons.py "<PNG绝对路径>" --project ChatAIO
```

PowerShell 示例：

```powershell
python scripts/replace-app-icons/replace-app-icons.py "C:\Users\Kuroneko\Desktop\icon.png" --project ChatAIO
```

Yarn 入口（等价）：

```bash
yarn replace-app-icons -- "<PNG绝对路径>" --project ChatAIO
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `source`（位置参数） | ✅ | **绝对路径** PNG（也接受 jpg/webp，推荐 PNG）。相对路径会直接报错退出。 |
| `--project` | 否 | 默认 `ChatAIO`。必须是脚本内 `PROJECT_LAYOUTS` 已登记的工程名。 |
| `--variant` | 否 | `prod`（默认）或 `dev`。`dev` 写入 `*-dev` 文件名（如 `app-icon-dev.ico`、`tray-icon-dev.macos.png`）；运行时由 `!app.isPackaged` 选择。 |
| `--dry-run` | 否 | 只打印将要写入的路径，不写盘。不确定布局时先跑这个。 |
| `--list-projects` | 否 | 列出已登记工程与输出路径映射后退出。 |

### DEV / 正式版双套图标

ChatAIO 同时维护两套资产；**不要**用手改文件名冒充，一律走本脚本：

```powershell
# 正式版（electron-builder icon + 打包后托盘）
python scripts/replace-app-icons/replace-app-icons.py "<prod.png>" --project ChatAIO --variant prod

# DEV 模式（yarn start / 未打包；文件名保持 *-dev）
python scripts/replace-app-icons/replace-app-icons.py "<dev.png>" --project ChatAIO --variant dev
```

| variant | 输出示例 |
|---------|----------|
| `prod` | `statics/icons/app-icon.{ico,icns,png}`、`tray-icon.macos(.@2x).png`、`main-icon-900x900.png` |
| `dev` | `statics/icons/app-icon-dev.{ico,icns,png}`、`tray-icon-dev.macos(.@2x).png`、`main-icon-900x900-dev.png` |

运行时选择：`projects/ChatAIO/src/Main/services/app-icons/`（`!app.isPackaged` → `*-dev`）。`electron-builder.yml` 的 `icon:` 始终指向正式版 `statics/icons/app-icon`。布局见 [`docs/architecture/app-icons.md`](../../projects/ChatAIO/docs/architecture/app-icons.md)。

### 硬性约束（Agent 必须遵守）

1. **源文件只读**：脚本不会、也不允许你去改写用户传入的原始 PNG。
2. **源图尺寸**：边长 ≥ **256**（electron-builder Windows 最低要求）；推荐 **≥ 1024** 正方形。非正方形会中心裁切并 WARNING。
3. **覆盖写入**：目标工程内已有图标文件会被 **原地覆盖**；这是预期行为。
4. **未经用户明确要求，不要 `git commit`** 生成结果。
5. Pillow 缺失时先安装，再重试：`python -m pip install pillow`。

---

## ChatAIO 输出清单（覆盖这些文件）

脚本写入（均相对 `projects/ChatAIO/`）：

| 输出文件 | 用途 | 规格 |
|----------|------|------|
| `statics/icons/app-icon.ico` | Windows **app icon**（写入 exe） | 多尺寸 ICO：16/20/24/32/40/48/64/128/**256**（缺 256 时 electron-builder 会失败） |
| `statics/icons/app-icon.icns` | macOS **app icon**（Dock / .app） | ICNS：16…1024 + @2x；生成时自动将主体缩至 **13/16** 并居中加透明边距 |
| `statics/icons/app-icon.png` | Linux **app icon** / Win·Linux **tray** | 512×512 PNG（满画布，不加 macOS 边距）；托盘运行时缩到 32px |
| `statics/icons/tray-icon.macos.png` | macOS **tray** Template | 18×18，黑 RGB + 原 alpha |
| `statics/icons/tray-icon.macos@2x.png` | macOS tray Retina | 36×36 Template |
| `statics/icons/main-icon-900x900.png` | 工程内「母版」参考图（**不打进安装包**） | 1024×1024 PNG（文件名历史遗留，尺寸以脚本为准） |

与构建/运行时的对应关系：

- `electron-builder.yml` → `icon: "statics/icons/app-icon"`（无后缀，按平台选 `.ico` / `.icns` / `.png`）
- `extraResources` 打包整个 `statics/`，但 **filter 排除母图** `icons/main-icon-900x900*.png`；运行时从 `resources/statics/icons` 读取
- Tray 代码：`projects/ChatAIO/src/Main/services/tray/index.ts`
  - Darwin → `tray-icon.macos.png` + `setTemplateImage(true)`
  - 其他 → `app-icon.png`（resize 32）

---

## Agent 执行清单（逐步）

```text
1. 确认用户给出的 PNG 绝对路径存在（Test-Path / ls）。
2. 若同时换 DEV + 正式版：分别用 --variant dev / prod 各跑一次（两张源图）。
3. （可选）dry-run 预览：
     python scripts/replace-app-icons/replace-app-icons.py "<abs.png>" --project ChatAIO --variant prod --dry-run
4. 正式生成：
     python scripts/replace-app-icons/replace-app-icons.py "<abs.png>" --project ChatAIO --variant prod|dev
5. 确认 stdout 出现 "verified: ... contains 256x256 layer" 与 "Source PNG was NOT modified."
6. 向用户汇报被覆盖的文件列表；提醒：Windows 资源管理器可能有图标缓存。
7. 仅当用户明确要求提交时再 git add / commit（在 monorepo 根执行）。
```

### 成功判定

- Exit code `0`
- `statics/icons/app-icon.ico` 体积通常远大于 1KB，且含 256 层（脚本会自动 verify）
- 源 PNG 的 mtime / 内容未变

### 失败处理

| 现象 | 处理 |
|------|------|
| `Pillow` / `No module named PIL` | `python -m pip install pillow` 后重试 |
| `source path must be absolute` | 把用户路径转成绝对路径再传入 |
| `source must be at least 256x256` | 请用户提供更大源图；不要强行用 16px 图 |
| `Icon must be at least 256x256`（打包时） | 说明旧 ICO 坏了；重新跑本脚本（勿手改） |
| `unknown project` | `--list-projects`；或在脚本 `PROJECT_LAYOUTS` 增加布局 |

---

## Windows 图标「看起来没变」

**构建产物里已经是新图标时，资源管理器仍显示旧图 = 系统 Icon Cache**，不是脚本失败。

已验证手段：对比 `win-unpacked\ChatAIO.exe` 内嵌 PNG hash 与 `statics/icons/app-icon.ico` 是否一致。

刷新建议（告诉用户即可，勿默认擅自清系统缓存）：

```powershell
ie4uinit.exe -show
Stop-Process -Name explorer -Force; Start-Process explorer
```

或把 exe 复制到新路径/新文件名再看；任务栏固定图标需取消固定后重钉。

---

## 规格速查（Electron / electron-builder）

| 平台 | App Icon | 最低 / 推荐 | Tray |
|------|----------|-------------|------|
| Windows | `.ico` 多尺寸 | 必须含 **256×256**；推荐源图 ≥1024 | 本仓库用 `app-icon.png` 缩到 32px |
| macOS | `.icns` | 源图推荐 1024；含 16–1024；**生成时自动 Dock padding（主体 13/16）** | Template Image：黑+alpha；常用 16/18 + @2x |
| Linux | `.png` | 常用 512 | 视实现；本仓库未单独 tray 资产 |

**macOS Dock 边距**：源图按满画布设计即可；`make_icns` 会把主体缩到画布的 **13/16（832/1024）** 并居中贴到透明画布上。Win/Linux 输出保持满画布。运行时 macOS 通过 `getAppIconPath()` 加载 `.icns`（勿再用未加边距的 `app-icon.png` 调 `dock.setIcon`）。

macOS Template：像素为黑、靠 alpha 塑形，系统在深浅菜单栏下自动反色。本脚本生成的 tray PNG 即为此格式；运行时仍调用 `setTemplateImage(true)`。

**Pillow 陷阱（已在脚本规避）**：对 ICO 调用 `save` 时若主图是 16×16，更大尺寸会被丢弃 → electron-builder 报 `provided: 16x16`。必须始终用 ≥256 的图作为 ICO 保存主体，并传 `sizes=[..., (256,256)]`。

---

## 扩展新工程

1. 打开 `replace-app-icons.py`，在 `PROJECT_LAYOUTS` 增加 `ProjectIconLayout(...)`。
2. 对齐该工程的 `electron-builder` `icon:` 路径与 tray 运行时文件名。
3. `--list-projects` 自测，再 `--dry-run` / 正式跑一遍。

不要为每个工程再复制一份生成逻辑。

---

## 与旧脚本的关系

| 路径 | 状态 |
|------|------|
| `scripts/replace-app-icons/`（本目录） | **唯一权威入口** |
| `projects/ChatAIO/scripts/replace-icons.py` | 薄封装，转发到本脚本 |
| `projects/ChatAIO/scripts/generate-icons.sh` | macOS-only 历史脚本（依赖 `sips`/`iconutil`）；跨平台替换请用本脚本 |

Agent **优先调用 monorepo 根脚本**，不要再维护第二套生成逻辑。

---

## 禁止事项（Negative constraints）

- ❌ 不要编辑用户传入的原始 PNG / 桌面源文件  
- ❌ 不要用「把 PNG 改后缀成 .ico」冒充图标  
- ❌ 不要只更新某一个平台文件而漏掉 tray / master 母图（除非用户明确只要单文件）  
- ❌ 不要在未确认 `--project` 的情况下写到错误子工程  
- ❌ 不要擅自 `git commit` / `git push`  
- ❌ 不要删除 `statics/` 里与图标无关的其它资源  
