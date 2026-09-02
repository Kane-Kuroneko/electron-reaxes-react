# Electron Reaxes React

Electron 应用。Git / Yarn / `tsc` 一律在**仓库根**执行。包管理只用 Yarn，不要 `npm i`。

本文件只索引全仓约定。需要某份说明时，点相对链接读原文。

## 写代码

- [编码规范](./CODING_STANDARD.md) — 开篇是设计哲学（分层严格度：动态边界运行时校验，核心协议静态约束）；import 置底、Tab（或 3 空格）、单引号 + 分号
- 本应用使用 Reaxes 系列库和架构；改代码必须读 [Reaxes 开发文档](./.agents/skills/reaxes-development/SKILL.md)
- 主进程、preload 与 IPC：[IPC 编码](./.agents/rules/ipc-coding.md)
- 本地 Reaxes 源码：`Z:\reaxes`

## Git

- [提交与同步](./.agents/rules/git-commit-policy.md) — 不擅自 commit / push；与远程只用 merge
- 分类本地改动：[审查本地改动](./.agents/skills/review-local-changes/SKILL.md)

## 命令

- 安装：`yarn`
- 开发：`yarn start:webpack`，再 `yarn start:electron`
- 构建：`yarn build:webpack`

## 新机 / 新 clone

1. `yarn setup:git-symlinks`（Windows 上 `core.symlinks=false` 会把软链变成普通文件；已退化则 `yarn tsx scripts/setup-git-symlinks.ts --restore`）
2. `yarn`

规则与 skills 真源见 [`.agents/README.md`](./.agents/README.md)；各工具方言目录只是单文件软链。
