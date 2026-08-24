---
description: Git 提交 / 同步策略：禁止擅自 commit；与远程整合一律 merge，禁止 rebase
alwaysApply: true
trigger: always_on
---

# Git Commit 策略

- **未经用户显式要求时，不得私自执行 `git commit`。**
- 若用户意图不明确（例如只说「改好了」「继续」），先完成代码修改并汇报，**不要**主动提交。
- 仅在用户明确说出 commit / 提交 / 保存到 git 等意图时，才创建 commit。
- 同样未经明确要求，不得 push、amend 或执行其他会改写 git 历史的操作。

# 与远程整合：一律 merge，禁止 rebase

- **禁止** `git rebase`、`git pull --rebase`、`git rebase --onto`、interactive rebase，以及任何等价改写历史的 rebase 操作。
- 本地与 `origin` 分叉、或 push 前需要同步远程时：**一律用 merge**（`git pull` / `git pull --no-rebase` / `git merge`），保留合并提交。
- 即使用户只说「提交并推送」，同步远程时也不得擅自改用 rebase；除非用户**显式**要求 rebase（即便如此也应先确认）。
- 例外仅限：用户在同一条指令里明确写出 `rebase` /「变基」并要求执行。

# 短 hash 写法（对齐 SourceTree）

- 对用户提到 git commit 时，**统一用 9 位短 hash**（例如 `e6c346255`、`2873bc58c`），不要用 7 位。
- 原因：本机 SourceTree / `git log --oneline` 默认显示 9 位；7 位（`e6c3462`）和 9 位是同一笔提交的前缀，写成 7 位会对不上界面。
- 需要完整 hash 时再用 40 位；不要混用 7 位与 9 位。
