# `.agents/`

给各家 AI coding agent 用的 **vendor-neutral 真源**（[Agent Skills](https://agentskills.io) / Codex 的 `.agents/skills/` 约定）。

| 目录 | 放什么 |
|------|--------|
| [`rules/`](./rules/) | 约束：编码、IPC、git、ChatAIO 架构摘要 |
| [`skills/`](./skills/) | 按需流程：每项一个文件夹 + `SKILL.md` |

索引在仓库根 [`AGENTS.md`](../AGENTS.md)。子工程 issue / 设计仍在该工程 `docs/`，不放这里。

`.claude/`、`.cursor/`、`.qoder/`、`.codex/` 只是各工具的加载入口。rules 与 skills 都只软链**单个文件**（mode `120000`）到本目录或根 `AGENTS.md`；**不要**把整个 `skills/<name>/` 或整棵 `.agents/` 做成目录软链（Git 对目录软链内部 pathspec 会报 `beyond a symbolic link`）。方言 skills 包目录必须是真实目录，里面只有 `SKILL.md` 指向本目录对应文件。改规则改这里，不要改方言目录里的副本。
