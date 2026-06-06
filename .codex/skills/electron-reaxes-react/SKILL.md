---
name: electron-reaxes-react
description: Work safely in the Z:\electron-reaxes-react Electron/Reaxes monorepo. Use when editing or reviewing project code, especially AI-WebApp settings, Electron main/preload/renderer IPC, Reaxes reaxels, bottom-import style, .qoder rules, or code that depends on the local Reaxes source at Z:\reaxes.
---

# Electron Reaxes React

## First Steps

Read these files before changing behavior:
- `.qoder/rules/coding-standard.md`
- `.qoder/rules/ipc-coding.md`
- `CODING_STANDARD.md`
- `AGENTS.md`
- The target subproject docs such as `projects/AI-WebApp/AI-CONFIG-ARCHITECTURE.md` and `projects/AI-WebApp/todo.md`

Use `rg`/`rg --files` first. This repo uses Yarn; do not install packages with npm. The local Reaxes implementation is available at `Z:\reaxes` when library behavior is unclear.

## Coding Rules

- Keep imports and exports at the bottom of TypeScript/TSX files. Order local/alias imports before third-party imports, with style imports last when present.
- Use tabs, or 3 spaces when spaces are unavoidable. Do not introduce 2-space or 4-space indentation.
- Prefer single quotes and semicolons, matching local style.
- Reaxel modules use `reaxel_` names and usually return `Object.assign(() => rtn, { store, setState, mutate })`.
- React components should use `reaxper` when matching existing SettingsView/Main patterns.
- Hooks are globally provided in this repo; existing code often uses `useEffect`, `useState`, etc. without React imports.
- If a function or utility is broadly reusable and business-agnostic, place it in the appropriate host `utils` or `toolkits` directory instead of keeping local copies in feature modules, for example `projects/AI-WebApp/src/shared/utils/clone-for-ipc.utility.ts`.
- Avoid unrelated cleanup. Many files have existing loose typing and commented debug code; only change it when needed for the task.

## IPC Rules

- Renderer code must call `window.api`/`api` exposed by `src/preload.ts`.
- Do not import `createIpc`, `ipcRenderer`, `ipcMain`, or use raw `webContents.send` in renderer components.
- Main process IPC goes through `src/Main/services/ipc/index.ts` via `useIpcRpc`, `useIpcRendererToMain`, or `useIpcMainToRenderer`.
- Every new channel must be typed in `projects/AI-WebApp/src/Types/IpcSchema.d.ts`, exposed in `src/preload.ts`, and wrapped in `Views/SettingsView/services/Settings` if the Settings UI needs it.

## AI-WebApp Runtime Model

- Settings UI lives under `projects/AI-WebApp/src/Views/SettingsView`.
- Electron main runtime lives under `projects/AI-WebApp/src/Main`.
- Settings persistence belongs in `src/Main/services/settings`; avoid persisting UI-only fields unless the runtime needs them.
- AI page identity should use `AI.AIItem.id`, not `AI_family`. Family describes service type; id describes a user-visible page instance.
- Menu order should follow the persisted `AIs` array order. Disabled AIs should not appear in `Application > Switch AI`.
- Each AI page needs an isolated persistent partition/session. Use stable partition names derived from `AIItem.id`.
- Global proxy is the default only for AIs whose `proxy_mode` is `follow_global_setting`. Per-AI `direct`, `from_server_list`, and `user_fill` settings override global proxy entirely.
- After settings apply/save, persist settings, sync existing AI views, update sessions/proxy, and rebuild the menu. Return a restart-required result only for settings that cannot be applied to existing Electron processes.

## Validation

Useful checks:
- `.\node_modules\.bin\tsc.cmd -p projects\AI-WebApp\tsconfig.json --noEmit`
- `.\node_modules\.bin\tsc.cmd -p projects\AI-WebApp\src\Views\SettingsView\tsconfig.json --noEmit`
- `yarn build:webpack`

Known caveat: the current tsconfigs can surface pre-existing `typeRoots`, generic-services, and dependency declaration errors unrelated to AI-WebApp changes. If that happens, rerun with narrower overrides such as `--typeRoots .\node_modules\@types --skipLibCheck`, then report the remaining pre-existing blockers separately.
