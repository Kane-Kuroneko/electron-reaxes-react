# ChatAIO — Agent Coding Guide

本目录是 monorepo **子工程**。当前工作区若以本目录为根打开，请先建立「根仓库」心智模型，再改代码。

| 角色 | 路径 |
|------|------|
| **Monorepo 根**（git 仓库根、Yarn workspace、engine 构建入口） | [`../../`](../../) → `electron-reaxes-react/` |
| **本子工程** | `.` → `projects/ChatAIO/` |

> 根目录相对本文件：`../..`（即 `projects/ChatAIO/../..`）。

---

## Git / 提交（必读）

**Git 仓库在 monorepo 根，不在本子工程目录。**

- 本目录下**没有**独立 `.git`；所有 `git status` / `git diff` / `git commit` / `git push` 都必须在 **monorepo 根路径**执行。
- 若用户要求提交：先把 cwd / agent workspace 切到 monorepo 根（`../../`），再执行 git 操作；不要在本子工程目录假装「本地仓库」。
- **未经用户显式要求，禁止擅自 `git commit` / `push` / `amend`。** 详见根规则：
  - [`.cursor/rules/git-commit-policy.mdc`](../../.cursor/rules/git-commit-policy.mdc)（本目录软链：[`.cursor/rules/git-commit-policy.mdc`](./.cursor/rules/git-commit-policy.mdc)）
  - [`.claude/skills/review-local-changes.md`](../../.claude/skills/review-local-changes.md)

---

## Monorepo 根文档索引（请优先读这些）

以下路径均相对 **monorepo 根**；本子工程内同名路径多为**软链接副本**，内容与根目录保持一致。

| 文档 | 根路径 | 本目录软链 / 入口 |
|------|--------|-------------------|
| Agent 总览（Claude） | [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md) | [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) |
| 编码规范（人读） | [`CODING_STANDARD.md`](../../CODING_STANDARD.md) | [`CODING_STANDARD.md`](./CODING_STANDARD.md) |
| 编码规范（agent rule） | [`.claude/rules/coding-standard.md`](../../.claude/rules/coding-standard.md) | [`.claude/rules/coding-standard.md`](./.claude/rules/coding-standard.md) |
| IPC 规范 | [`.claude/rules/ipc-coding.md`](../../.claude/rules/ipc-coding.md) | [`.claude/rules/ipc-coding.md`](./.claude/rules/ipc-coding.md) |
| ChatAIO 架构要点 | [`.claude/rules/chat-aio-architecture.md`](../../.claude/rules/chat-aio-architecture.md) | [`.claude/rules/chat-aio-architecture.md`](./.claude/rules/chat-aio-architecture.md) |
| Reaxes 开发 skill | [`.claude/skills/reaxes-development.md`](../../.claude/skills/reaxes-development.md) | [`.claude/skills/reaxes-development.md`](./.claude/skills/reaxes-development.md) |
| Qoder 规则 / skills | [`.qoder/`](../../.qoder/) | [`.qoder/`](./.qoder/) |
| Codex skill | [`.codex/skills/electron-reaxes-react/SKILL.md`](../../.codex/skills/electron-reaxes-react/SKILL.md) | [`.codex/`](./.codex/) |
| 根 README（构建说明） | [`readme.md`](../../readme.md) | — |

各家工具入口约定：

- **通用 / Cursor / Codex 等**：读本文件 [`AGENTS.md`](./AGENTS.md)
- **Claude Code**：[`CLAUDE.md`](./CLAUDE.md) → 软链到本文件；并加载 [`.claude/`](./.claude/)
- **Cursor Rules**：[`.cursor/rules/`](./.cursor/rules/)
- **Qoder**：[`.qoder/`](./.qoder/)
- **Codex**：本文件 + [`.codex/`](./.codex/)

---

## 本子工程文档

- [`fixme.md`](./fixme.md) — 问题清单（P0–P3）
- [`todo.md`](./todo.md)
- [`docs/architecture/`](./docs/architecture/) — AI 配置、构建、i18n、menubar 等
- [`docs/features/`](./docs/features/)
- [`docs/issues/`](./docs/issues/) — 含 menubar 拖拽 / 鼠标穿透调查

改 FloatingView、menubar、透明窗、鼠标穿透前必读：

- [`docs/issues/menubar-drag-investigation.md`](./docs/issues/menubar-drag-investigation.md)
- [`docs/issues/menubar-drag-region-leak-below-content.md`](./docs/issues/menubar-drag-region-leak-below-content.md)

### 替换 App / Tray 图标（Agent）

用户要求更换应用图标时，**不要手改 `.ico` / `.icns`**，在 monorepo 根调用统一脚本（附完整 agent 手册）：

- 手册：[`../../scripts/replace-app-icons/AGENTS.md`](../../scripts/replace-app-icons/AGENTS.md)
- 命令：

```bash
python scripts/replace-app-icons/replace-app-icons.py "<PNG绝对路径>" --project ChatAIO
# 或
yarn replace-app-icons -- "<PNG绝对路径>" --project ChatAIO
```

源 PNG 只读；会覆盖 `statics/gpt.{ico,icns,png}`、macOS tray template、shared master。未经用户要求不要 commit。

---

## 新机 / 新 clone 检查清单

1. 工作目录切到 **monorepo 根**（git 仓库根）。
2. 跑 `yarn setup:git-symlinks`（`.git/config` **不会**进版本库，每台机器都要设；否则 Windows 上软链会退化成文本文件）。
3. `yarn` 安装依赖；勿用 `npm i`。

---

## 快速命令

依赖安装与 engine 均在 **monorepo 根**；本仓库使用 **Yarn**，勿用 `npm i`。

在 monorepo 根：

```bash
yarn build:webpack
# 或
npm start ChatAIO
```

在本子工程目录（脚本内部会 `--cwd ../..`）：

```bash
yarn start:webpack
yarn start:electron
yarn build:webpack
```

类型检查（建议在 monorepo 根执行）：

```bash
./node_modules/.bin/tsc.cmd -p projects/ChatAIO/tsconfig.json --noEmit
```

---

## 编码要点（摘要）

完整规范见根目录 [`CODING_STANDARD.md`](../../CODING_STANDARD.md) / [`.claude/rules/coding-standard.md`](../../.claude/rules/coding-standard.md)。

- **import/export 放文件底部**；顺序：相对路径 → 别名 → 第三方 → 样式
- 缩进优先 **Tab**（或 3 空格）；单引号 + 分号
- Reaxel：`reaxel_*`；组件常用 `reaxper`；hooks 多为全局注入
- IPC：渲染进程只用 `window.api`；主进程用 `useIpc*`；store 相关 payload 先 `cloneForIPC`
- AI 身份用 `AI.AIItem.id`，不要用 `AI_family` 当实例 id
- Windows FloatingView：**禁止** `setIgnoreMouseEvents(true, { forward: true })`

路径别名（相对 monorepo）：`#root/*`、`#root-projects/*`、`#project/*`、`#generics/*`、`#main/*`、`#src/*`

本地 Reaxes 实现参考：`Z:\reaxes`（行为不清时查阅）

---

## 软链接说明

本目录下 `.claude/`、`.cursor/rules/`（共享规则）、`.qoder/`、`.codex/`、`CODING_STANDARD.md`、`CLAUDE.md` 为指向 monorepo 根的**软链接副本**，避免与根文档分叉。  
若链接失效，以 monorepo 根路径下的原文为准，并按上表相对路径修复链接。

### Git 必须启用 `core.symlinks`（新机 / 新 clone 必做）

**`.git/config` 不会进入版本库。** 某台机器上设好的 `core.symlinks=true` 不会随 commit/push 带到其他机器。  
Windows 上 Git 常在 clone/init 时把**本地** `core.symlinks` 写成 `false`，检出时会把软链**退化成只含目标路径的普通文本文件**。本仓库依赖真实软链。

**Agent / 开发者在新机首次拉代码后，必须先在 monorepo 根执行一次：**

```bash
yarn setup:git-symlinks
# 若软链已退化成普通文件：
yarn tsx scripts/setup-git-symlinks.ts --restore

# 或手动
git config --local core.symlinks true
```

前置：Windows 开发人员模式，或已启用 `SeCreateSymbolicLinkPrivilege`。  
验证：`git config --local --get core.symlinks` 应为 `true`；`Get-Item projects/ChatAIO/CLAUDE.md` 的 `LinkType` 应为 `SymbolicLink`。