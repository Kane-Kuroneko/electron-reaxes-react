# Electron Reaxes React — Monorepo

A Yarn monorepo building Electron applications with the **Reaxes** framework (MobX-based reactive state management). The flagship subproject is **ChatAIO** — an Electron shell that hosts multiple AI web services (ChatGPT, Claude, Gemini, Grok, etc.) in isolated WebContentsViews.

## Quick Start

```bash
yarn build:webpack          # Build the Electron app
npm start ChatAIO           # Start ChatAIO
```

## Rules Index

Rules in `.claude/rules/` are **constraints/conventions** — prescriptive do's and don'ts. The system loads them automatically when conditions match.

| Rule File (`.claude/rules/`) | 加载条件 / Load When | 内容概要 |
|------------------------------|---------------------|----------|
| `coding-standard.md` | **始终加载** | 缩进(Tab/3空格)、import 放文件底部、命名规范(reaxel_/Refaxel_/.utility.ts/kebab-case)、引号分号、注释、TypeScript |
| `chat-aio-architecture.md` | 编辑 `projects/ChatAIO/` 下文件、涉及 AI 配置/会话/代理/设置持久化时 | ChatAIO 架构关键点、AI 身份与代理规则、验证命令、项目文档索引 |
| `ipc-coding.md` | 编辑 Electron 主进程、preload、IPC 通道、跨进程通信时 | 主进程用 `useIpc*` 封装(禁 raw ipcMain)、渲染进程用 `window.api`(禁 ipcRenderer)、新增通道三步流程、cloneForIPC |

## Skills Index

Skills in `.claude/skills/` are **workflows/guides** — procedural knowledge and API references. When the trigger condition matches, **read the skill file** for detailed instructions.

| Skill File (`.claude/skills/`) | 何时读取 / When to Consult | 内容概要 |
|-------------------------------|--------------------------|----------|
| `reaxes-development.md` | 编辑 reaxel/Refaxel/store/reaxper 组件、涉及业务逻辑范式时 | Reaxes 完整 API 参考：createReaxable/reaxel/reaxper、Way A(命令式)/Way B(响应式)、distinctCallback、obsReaction、Refaxel 多例工厂 |
| `review-local-changes.md` | 用户说 "看看改了啥 / review diff / 整理提交 / 该不该commit / 准备提交" 时 | 审查未提交改动 → 分类(A 有效/B 临时/C 垃圾) → 分组提交建议，禁止擅自 commit/push |

## Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `#root/*` | Repository root `./*` |
| `#root-projects/*` | `./projects/*` |
| `#project/*` | Current project `src/*` |
| `#generics/*` | `./generic-services/*` |
| `#main/*` | Current project `src/Main/*` |
| `#src/*` | Current project `src/*` |

## Git Commits

- Concise subject + body bullets covering: product/doc changes, implementation, bug fixes, i18n/config, verification
- Single-line commits only for genuinely trivial changes
