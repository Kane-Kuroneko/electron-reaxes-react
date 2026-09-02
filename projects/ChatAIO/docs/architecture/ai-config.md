# AI Configuration Management

> 现行规范。目录是扁平供应商列表，不是默认 `AIItem` 种子袋（2026-08-28 纠偏）。分批落地记录与已否决项见 [`../feature-proposal--ai-catalog-source.md`](../feature-proposal--ai-catalog-source.md)。Settings 手动检查更新见 [`../features/ai-catalog-manual-update.md`](../features/ai-catalog-manual-update.md)。

## Architecture Overview

三层，只在 main 的 `AIConfigService` 里合成；renderer 只拿 IPC 下发的 **页实例** `AIItem[]`。

| | 供应商目录 | 用户运行时 |
|--|--|--|
| 文件 | bundled `default-ais.json` / cache `catalog-ais.json` | `user-ais.json` / Settings `AIs` |
| 是什么 | 有哪些供应商 | 用户打开的页（可同 family 多实例） |
| id | 供应商 UUID | 实例 id（官方种子页 = 供应商 UUID） |
| 字段 | `id` + `family` + `label` + `url` + `region` | 完整 `AI.AIItem` |

> **升级陷阱**：从 1.0.5 跳到含 Chrome 身份补丁 + 目录 UUID 的包后，预加载页会对旧分区 `loadURL`，站点 `Set-Cookie` 覆盖登录。无 `user-ais.json` 还会整表切到 UUID 空分区。见 [`../issues/ai-login-session-lost-after-catalog-uuid.md`](../issues/ai-login-session-lost-after-catalog-uuid.md)。

1. **Bundled catalog**（`statics/ai-catalog/default-ais.json`）
   - main 启动用 `fs` 读（不是 webpack import），**用户永不改这份文件**
   - 落盘形状在 [`src/Types/AICatalog.d.ts`](../../src/Types/AICatalog.d.ts)：`Catalog.ais` 是 `Vendor[]`，**不是** `AI.AIItem[]`
   - **基数**：每个 family 至多一行供应商。用户多实例只活在 `user-ais.json`
   - 官方入口 URL 写在供应商行上。`region` 是该供应商 ISO 覆盖，不拷进 `AIItem`。`custom` 没有目录行，默认 url 为 `''`
   - Renderer / Settings / ManageAIs **不 import** 该 JSON。加站默认 URL 走已有 `get-default-ais`（返回**映射后的默认实例**）。AI view 打开地址只用 `ai.url`

2. **Catalog cache**（`userData/catalog-ais.json`，可选）
   - 用户在 Settings 确认过的已验签瘦目录。**没有该文件时行为与只有 bundled 相同。**
   - 若存在且 `revision` ≥ bundled 且通过 `validateCatalog`，则用它当 runtime 目录
   - 远程输入：ChatAIO-Releases tag `ai-catalog` 的 Release 资产（JSON+sig）。不是第四事实源，也不是 Releases 仓目录里的拷贝。启动不拉网。

3. **User AIs**（`userData/user-ais.json`）
   - **整表 + `deletedIds`，不是 delta。** `replaceAllAIs` 写入当前有效列表全文，并用「目录种子页有、当前表没有」的 id 填 `deletedIds`
   - 旧文件里的 semver `version` 读到忽略，写入不再抄

**映射（第一启动 / 无 user 文件）：** `vendorToAIItem` 把供应商行补成实例：proxy `follow_global_setting`、preload `false`、`url_override` `null`、`disabled` **读** App 纯数据名单 [`src/shared/statics/ai-family-disabled-by-default.ts`](../../src/shared/statics/ai-family-disabled-by-default.ts)（Manus / AI Studio / Copilot 等原先 JSON 里 `disabled:true` 的 family）。名单是 typed 常量、无函数；映射函数不和名单定义混文件。`dev-proxy-test` 只在 `dev()` 注入，不进生产目录 JSON。

Runtime 目录 = bundled 与 cache 里 `revision` 较高且通过校验者。Effective AIs = 该目录映射出的种子页与 user 表按供应商 UUID 合成。

不要在 `AIConfigService` 上存派生 `Map`，不要「每 family 取第一条实例」。

### Effective 列表（无新目录事件）

```
Effective AIs = user.ais（保持用户顺序）
  + 当前目录映射出的种子页里 user 没有、且 id 不在 deletedIds 的项（按目录顺序追加）
无 user 文件时 = 供应商目录 × 内置策略
```

不要把 user 文件理解成「只存改过的字段」。用户改一个 URL，磁盘上仍是完整 `ais` 数组。用户自己加的第二个同 family 页是新 id，目录更新碰不到它。

### 三路 merge（有新目录时，用户确认后写盘）

记号：`base` = 上次已采用供应商目录（无 cache 时 = bundled），`theirs` = 新目录，`ours` = **当前 effective 列表**（`getEffectiveAIs()`：user 表 + 已 compose、但还不在 `user-ais.json` 的官方种子页）。不要只用 `user.ais`，否则 Settings Modal 会把已经在用的供应商标成「将新增」。无 user 文件时 ours = 目录映射。

- **新增**：theirs 有、ours 无、且 id 不在 `deletedIds` → 映射成种子实例后追加
- **目录改字段**：同 id 且 `ours.field === base.field` → 可更新为 `theirs.field`（只 url / label）
- **跳过**：用户改过的 url/label；任意 `url_override`；`id` 以 `custom-` 开头；用户加的新 id
- **目录删除**：base 有、theirs 无 → **不**自动从 ours 删，diff 标 `catalogDropped`
- **disabled / proxy / preload**：不是目录字段，merge 不改

纯函数：`validateCatalog`、`vendorToAIItem`、`composeEffectiveAIs`、`previewCatalogMerge` / `applyCatalogMerge`。不把 catalog/cache 放进 renderer store，不用 `obsReaction` 监听文件。

## File Structure

```
projects/ChatAIO/
├── statics/
│   └── ai-catalog/
│       └── default-ais.json          # 瘦供应商目录（fs-loaded by main）；不含默认关名单
│       ├── ed25519.pub               # 目录验签公钥（可提交）
│       └── default-ais.json.sig      # 原文 raw Ed25519 的 base64 一行
├── src/
│   ├── shared/statics/
│   │   └── ai-family-disabled-by-default.ts  # 纯信息：首启默认关闭的 family（无函数）
│   ├── Types/
│   │   └── AICatalog.d.ts            # Vendor / Catalog / UserAIs / validate+merge 契约
│   └── Main/services/settings/
│       ├── ai-config-service.ts      # 读盘、映射默认实例、命令式调用 validate/merge
│       └── utils/                    # 纯函数，不要和 *service.ts 平铺
│           ├── ai-catalog-builtin.utility.ts  # 映射/注入：vendorToAIItem、dev 注入；读上面那份名单
│           ├── normalize-ai-item.utility.ts  # 入参供应商列表，给用户实例补空 url
│           ├── ai-catalog-validate.utility.ts  # UUID / family / region ISO / 重复 → 整份非法
│           ├── ai-catalog-region.utility.ts    # catalog.region 判定；实例按 id/family 回查
│           ├── ai-catalog-merge.utility.ts    # 目录行 → 种子实例，按 UUID 对齐
│           ├── ai-catalog-sign.utility.ts     # 只 verify；远程 URL + host 白名单
│           ├── ai-catalog-update.utility.ts   # 手动更新：验签/preview/pending（不 fetch）
│           └── ai-catalog-update-runtime.utility.ts  # 全局代理 + 限体积拉 GitHub Release；确认后 adopt cache
└── userData/
    ├── user-ais.json                 # 用户整表 + deletedIds
    └── catalog-ais.json              # 可选 cache；没有则只用 bundled
```

**数据 vs 映射：** 默认关名单是 App 策略（typed TS 信息文件），不是供应商事实源，也不要锁某个 utility 路径当契约。mapping 文件可以改名，只要继续 **读** 那份名单。

## AIConfigService API

### Core Methods

```typescript
// 默认页实例（供应商目录 + 内置策略映射），不是目录原样
getDefaultAIs(): AI.AIItem[]

// Get user modifications (null if none)
getUserAIs(): AI.AIItem[] | null

// Save user configurations
saveUserAIs(ais: AI.AIItem[]): void

// Get effective configurations (merged)
getEffectiveAIs(): AI.AIItem[]

// Reset to defaults
resetToDefaults(): void

// Check if user has modifications
hasUserModifications(): boolean
```

### CRUD Operations

```typescript
// Get specific AI
getAIById(id: string): AI.AIItem | undefined

// Update AI
updateAI(id: string, updates: Partial<AI.AIItem>): AI.AIItem | null

// Add new AI
addAI(ai: Omit<AI.AIItem, 'id'> & { id?: string }): AI.AIItem

// Delete AI
deleteAI(id: string): boolean
```

### Preload Management

```typescript
// Get AIs marked for preload on startup
getPreloadAIFamilies(): AI.AIFamily[]
```

## IPC RPC Methods

Available through preload API. 跨进程仍是实例，不把瘦目录送到 renderer。

```typescript
window.api.getAIs()
window.api.getDefaultAIs()  // 映射后的默认实例 AIItem[]
window.api.updateAI(id, updates)
window.api.addAI(aiConfig)
window.api.deleteAI(id)
window.api.reorderAIs(orderedIds)
window.api.resetAIsToDefaults()
window.api.checkAiCatalogUpdate()
window.api.applyAiCatalogUpdate(revision)
window.api.getPreloadAIFamilies()
```

列表顺序就是 `ais` 数组下标。Switch AI 右键拖与 Manage AIs 表拖都通过 `reorderAIs` **立即写盘**，不走 Apply。细节与不变量见 [`../features/ai-list-reorder.md`](../features/ai-list-reorder.md)。

## Usage in Settings UI

1. On settings view open, call `fetchSettings()`
2. AI configurations are loaded from `AIConfigService`
3. User modifications are saved via `submitSettings()` or individual CRUD methods

## userData Location

The user configuration file is stored in Electron's userData directory:

- **Windows**: `%APPDATA%/ChatAIO/user-ais.json`
- **macOS**: `~/Library/Application Support/ChatAIO/user-ais.json`
- **Linux**: `~/.config/ChatAIO/user-ais.json`
