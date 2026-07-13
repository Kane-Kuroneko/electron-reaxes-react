# Electron Reaxes React — Monorepo

A Yarn monorepo building Electron applications with the **Reaxes** framework (MobX-based reactive state management). The flagship subproject is **ChatAIO** — an Electron shell that hosts multiple AI web services (ChatGPT, Claude, Gemini, Grok, etc.) in isolated WebContentsViews.

## Quick Start

```bash
yarn build:webpack          # Build the Electron app
npm start ChatAIO           # Start ChatAIO
```

## Must-Know Conventions (read before editing any file)

### 1. Imports go at the BOTTOM
All `import`/`export` statements go at the **end** of TypeScript/TSX files — never at the top.
Order (from bottom-up): relative → project alias (`#xxx`) → third-party → styles last.

### 2. Indentation
**Tabs** (preferred) or **3 spaces**. Never 2 or 4 spaces. `.editorconfig`: `indent_style = tab`, `tab_width = 3`.

### 3. Quotes & Semicolons
Single quotes preferred. Semicolons at statement ends.

### 4. Naming
- `reaxel_Xxx` — Reaxel state modules (camelCase `reaxel_` + PascalCase name)
- `Refaxel_Xxx` — Multi-instance Reaxel factories
- `.utility.ts` — Utility file suffix
- kebab-case — Directories and reaxel module directories

### 5. IPC (Electron process communication)
- **Renderer**: use `window.api.xxx()` — NEVER import `ipcRenderer` or `createIpc` in renderer code
- **Main process**: use `useIpcRpc` / `useIpcRendererToMain` / `useIpcMainToRenderer` — NEVER raw `ipcMain.on` / `ipcMain.handle` / `webContents.send`
- **New channels**: type in `IpcSchema.d.ts` → expose in `src/preload.ts` → wrap in Settings service if Settings UI needs it
- **Before crossing IPC**: `cloneForIPC()` on any payload from `reaxel_*.store` — including menubar menu structure after Main→Renderer push (store round-trip). Plain JSON from main **becomes observable in store**; Renderer→Main must clone again.
- See `.claude/rules/ipc-coding.md` for full details, menubar examples, and review checklist

### 6. React + Reaxes
- Wrap components with `reaxper()` for reactive rendering (like MobX `observer`)
- React hooks (`useState`, `useEffect`, `useRef`, etc.) are **globally injected** via webpack ProvidePlugin — no import needed
- Read reaxel state: `reaxel_Xxx.store.field`
- Call reaxel methods: `reaxel_Xxx().method()`
- `setState`/`mutate` are Proxy-based — both callable as functions AND chainable: `setState.profile.name(...)` / `mutate.items(arr => ...)`
- See `.claude/rules/reaxes-development.md` for full framework reference

### 7. Business Logic Paradigm
- **Way A (Command — default for business flows)**: expose methods in reaxel `rtn` that call `setState` + follow-up logic explicitly. Preferred for user-triggered workflows, async chains, error handling.
- **Way B (Reactive — edge effects only)**: use `obsReaction` to auto-respond to store changes. ONLY for simple state→external sync (theme→DOM, store→localStorage, logging). Never for business main flows.

### 8. Utility Placement
Broadly reusable, business-agnostic functions go in `utils/` or `toolkits/` of the appropriate host, not in feature modules. Use `.utility.ts` naming.

### 9. Git Commits
- Concise subject + multiple body bullets covering: product/doc changes, implementation, bug fixes, i18n/config, verification
- Single-line commits only for genuinely trivial changes

### 10. Windows FloatingView Mouse Passthrough
- Never change ChatAIO FloatingView to `setIgnoreMouseEvents(true, { forward: true })` on Windows.
- Electron mouse forwarding conflicts with dragging another BrowserWindow and causes menubar jitter, flicker, and sticky lag even when FloatingView is hidden.
- Keep `{ forward: false }`; if forwarded mouse movement ever becomes necessary, disable forwarding for the full window move/resize interval and rerun the regression matrix.
- Read [`menubar-drag-investigation.md`](../projects/ChatAIO/docs/issues/menubar-drag-investigation.md) before changing FloatingView, menubar drag regions, transparent windows, or mouse passthrough.

## Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `#root/*` | Repository root `./*` |
| `#root-projects/*` | `./projects/*` |
| `#project/*` | Current project `src/*` |
| `#generics/*` | `./generic-services/*` |
| `#main/*` | Current project `src/Main/*` |
| `#src/*` | Current project `src/*` |

## ChatAIO Architecture (key points)

- **Settings UI**: `projects/ChatAIO/src/Views/SettingsView`
- **Electron main**: `projects/ChatAIO/src/Main`
- **Settings persistence**: `src/Main/services/settings` — don't persist UI-only fields unless runtime needs them
- **AI identity**: use `AI.AIItem.id`, not `AI_family`. Family = service type; id = user-visible page instance
- **Menu order**: follows persisted `AIs` array order; disabled AIs don't appear in `Application > Switch AI`
- **AI sessions**: each AI page needs isolated persistent partition/session, named from `AIItem.id`
- **Proxy**: global proxy is default only for AIs with `proxy_mode: follow_global_setting`; per-AI `direct`/`from_server_list`/`user_fill` override global
- **After settings save**: persist → sync AI views → update sessions/proxy → rebuild menu. Return restart-required only for settings that can't hot-apply
- **Architecture docs**: `projects/ChatAIO/docs/architecture/`
- **Issues/todo**: `projects/ChatAIO/fixme.md`, `projects/ChatAIO/todo.md`

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

## Detailed Rules

| File | When Loaded | Content |
|------|-------------|---------|
| `.claude/rules/coding-standard.md` | Always | Full coding standards (indentation, naming, imports, patterns) |
| `.claude/rules/ipc-coding.md` | On-demand | IPC rules with correct/wrong examples and checklist |
| `.claude/rules/reaxes-development.md` | On-demand | Reaxes framework API reference, patterns, and best practices |

## Project-Specific Docs

- `CODING_STANDARD.md` — Human-readable coding standards (root)
- `projects/ChatAIO/docs/architecture/ai-config.md` — AI config dual-layer system
- `projects/ChatAIO/docs/architecture/build-pipeline-and-dev-refresh.md` — Build system
- `projects/ChatAIO/docs/architecture/i18n.md` — i18n architecture
- [`projects/ChatAIO/docs/issues/menubar-drag-investigation.md`](../projects/ChatAIO/docs/issues/menubar-drag-investigation.md) — Windows FloatingView mouse-forwarding drag bug, root cause, fix, and regression matrix
- `projects/ChatAIO/fixme.md` — Prioritized bug/issue tracker (P0–P3)

## Reaxes Source

The local Reaxes implementation lives at `Z:\reaxes` — consult it when library behavior is unclear.
