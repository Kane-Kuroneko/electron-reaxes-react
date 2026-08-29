---
description: ChatAIO 架构、AI 身份与代理、验证命令
alwaysApply: true
trigger: always_on
---

# ChatAIO Architecture

> 加载条件：编辑 `projects/ChatAIO/` 下文件或涉及 ChatAIO 业务逻辑时参考。

## Architecture Key Points

- **Settings UI**: `projects/ChatAIO/src/Views/SettingsView`
- **Electron main**: `projects/ChatAIO/src/Main`
- **Settings persistence**: `src/Main/services/settings` — don't persist UI-only fields unless runtime needs them
- **AI identity**: use `AI.AIItem.id`, not `AI_family`. Family = service type; id = user-visible page instance
- **Menu order**: follows persisted `AIs` array order; disabled AIs don't appear in `Application > Switch AI`
- **AI sessions**: each AI page needs isolated persistent partition/session, named from `AIItem.id`
- **Proxy**: global proxy is default only for AIs with `proxy_mode: follow_global_setting`; per-AI `direct`/`from_server_list`/`user_fill` override global
- **After settings save**: persist → sync AI views → update sessions/proxy → rebuild menu. Return restart-required only for settings that can't hot-apply
- **Path alias `#shared/*`**: `projects/ChatAIO/src/shared/*`. Shared data/types layer; use `#shared/...` instead of `../../../shared/...` or `#src/shared/...`. Wired in ChatAIO `tsconfig.json` / View tsconfigs, `partial.webpack-conf.ts`, and `package.json` `imports`. tsx tests/scripts pass `--tsconfig projects/ChatAIO/tsconfig.json`.

## Validation Commands

```bash
# Type-check ChatAIO (full)
.\node_modules\.bin\tsc.cmd -p projects\ChatAIO\tsconfig.json --noEmit

# Type-check SettingsView only
.\node_modules\.bin\tsc.cmd -p projects\ChatAIO\src\Views\SettingsView\tsconfig.json --noEmit

# Build
yarn build:webpack
```

Known caveat: current tsconfigs may surface pre-existing `typeRoots`/generic-services/dependency-declaration errors unrelated to your changes. If that happens, re-run with `--typeRoots .\node_modules\@types --skipLibCheck` and report remaining blockers separately.

## Project-Specific Docs

- `AGENTS.md` — **Monorepo global rules**. `projects/ChatAIO/AGENTS.md` is the ChatAIO entry (global pointer at top, then local index). `DOCS.md` / `CLAUDE.md` alias it.
- `projects/ChatAIO/docs/agent/feature-design-and-comments.md` — New features must land with a design doc and comments on key modules
- `CODING_STANDARD.md` — Human-readable coding standards (root)
- `projects/ChatAIO/fixme.md` — Prioritized bug/issue tracker (P0–P3)

## Reaxes Source

The local Reaxes implementation lives at `Z:\reaxes` — consult it when library behavior is unclear.
