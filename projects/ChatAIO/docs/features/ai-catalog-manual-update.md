# AI 目录手动更新

Settings → Manage AIs 可以检查**供应商目录**更新。远程是 [ChatAIO-Releases](https://github.com/Kane-Kuroneko/ChatAIO-Releases) 滚动 tag `ai-catalog` 的 **GitHub Release 资产**，不是 Releases 仓工作区里的一份拷贝。

本仓 `statics/ai-catalog/` 是下一版草稿 / 安装包兜底。`yarn publish:ai-catalog` 把签过名的 JSON+sig 推上 tag 之后，已装 App 才拉得到。目录更新不是 App 安装包更新（About 里那条是 electron-updater）。ChatAIO-Releases 的 `ai-catalog` tag **禁止**标成 GitHub Latest，否则 updater 会去拉 `.../download/ai-catalog/latest.yml` 并 404。`yarn publish:ai-catalog` 必须 `--latest=false`。

## 不变量

1. **启动不拉网。** 只有用户点「检查 AI 目录更新」才 fetch。
2. **确认前不写盘。** check 只验签 + preview；cache `catalog-ais.json` 和 user 表只在 apply 之后改。
3. **pending 同一时刻一份，活在 `AIConfigService` 的 cycle 实例上，不是模块全局。** apply 必须带上这次 check 的 `remoteRevision`；对不上或没有 pending → 拒绝。**失败的 check（网络 / 验签 / schema）不清上一份成功 pending**；`up-to-date` 才清；新的 `available` 覆盖。写盘成功才 `commit`。**用户取消预览会 `discard` pending**，必须再检查才能 apply。重叠的 check 串行，只有最新一次能改 pending。`beginCatalogCheck` / `checkSignedCatalog` / `applySignedCatalog` 不是 public API；IPC 只走 `checkAiCatalogUpdate` / `applyAiCatalogUpdate` / `discardAiCatalogUpdate`。
4. **跨进程仍是实例。** check 下发的 diff 是种子页的瘦预览（id / label / url），不是整份 `AIItem`，也不是瘦目录原样。`get-ais` / `get-default-ais` 返回类型不变。
5. **用户改过的种子页、`url_override`、`custom-` id、用户自加的同 family 第二页，目录更新碰不到。** 目录删行不自动从 user 表删，diff 标「ChatAIO已停止维护，但已存在的本地数据仍会被保留」。**用户 `deletedIds` 里已经没有的页不出现在 catalogDropped。**
6. **region 只活在目录上。** 只改 region、页字段没变时仍要 apply（把 cache 写成新 revision），否则覆盖判定不更新。
7. **Settings 有未 Apply 的改动时先保存或放弃。** 目录合并写的是磁盘上的 user 表，不能盖掉编辑器里没保存的页。
8. **in-flight 真相在 `reaxel_SettingsView` 的 `catalog_update`（`checking` / `applying`）。** 任一为 true，`checkAiCatalog` / `applyAiCatalog` 同步 return，不发第二次 IPC。check 与 apply 互斥。组件不用 `useRef` / `useState` 做锁。主进程队列仍串行；busy 时若仍发 IPC，第一次写盘成功后第二次会 `no-pending`。**侧栏/页脚只在预览未关闭或 `applying` 时锁住**，必须在 Modal 里应用或取消。**`checking` 单独不锁 chrome**：检查中没有可取消的 Modal；fetch / 内存 session 清理若卡住，把 tab 和页脚一起冻住就是无限 loading。按钮 spinner 已经表示 in-flight。`checking` / `applying` 必须在 `finally` 清掉。
9. **缺公钥（ENOENT）或空 PEM 是 `verify-failed`，不是 `network`。** 交给 ingest 验签失败，不要把 `readFileSync` 抛错丢给 IPC catch。
10. **GitHub 下载走 App 全局代理**（与 Settings 里同一套 `resolveGlobalProxy`），边下边限体积；超限是 `invalid-catalog`。维护者 env 本地读盘不走代理。
11. **写盘成功后 sync AI 页失败：IPC 仍 `success`，带 `restartRequired`。** UI 提示后强制重启。单页 init/update 失败尽量吞掉并打日志，不让一次坏页挡掉整次 sync。
12. **check IPC 必须能 settle。** 禁止 `await` 内存 partition（无 `persist:`）的 `clearCache` / `clearStorageData`：Electron 上 historically 永不 resolve（[electron#16141](https://github.com/electron/electron/issues/16141)），会卡住队列，`checking` 清不掉。单次 fetch 20s、整次 check 25s 硬超时；AbortController 只是尽力，不能当唯一超时。不匹配的 proxy `login` 必须 `callback()` 取消，否则 `session.fetch` 一直挂。Renderer 30s watchdog 是最后一道闸。目录 fetch 复用名为 `ai-catalog-fetch` 的内存 partition，不要每次 unique name 再清 session。

## 入口与数据流

```mermaid
flowchart TD
  btn["Manage AIs: Check AI catalog"]
  fetch["GitHub Release JSON + sig"]
  verify["Ed25519 + validateCatalog"]
  preview["previewCatalogMerge"]
  pending["内存 pending"]
  modal["Modal diff"]
  apply["apply-ai-catalog-update(revision)"]
  cache["userData/catalog-ais.json"]
  user["userData/user-ais.json"]
  sync["syncRuntimeViews"]

  btn --> fetch --> verify
  verify -->|失败| err["UI 报错，不写盘"]
  verify -->|revision 不高| uptodate["已是最新"]
  verify -->|更高 revision| preview --> pending --> modal
  modal -->|确认| apply
  apply --> user --> cache --> sync
  modal -->|取消| drop["丢掉 UI 与 main pending"]
```

远程 URL（host 钉死，见 `ai-catalog-sign.utility.ts`）：

- `https://github.com/Kane-Kuroneko/ChatAIO-Releases/releases/download/ai-catalog/default-ais.json`
- 同上 `.sig`

dev / 维护者可用 `CHATAIO_CATALOG_REMOTE_JSON` + `CHATAIO_CATALOG_REMOTE_SIG` 指向本地已签名文件：**直接读盘，不走 URL 白名单、不伪装成 GitHub URL**。不要拿这个当用户功能。

## IPC

- `check-ai-catalog-update()` → `{ status, bundledRevision, cacheRevision, remoteRevision?, diff?, errorCode? }`
- `apply-ai-catalog-update(revision)` → `{ success, errorCode?, restartRequired?, settings? }`
- `discard-ai-catalog-update()` → `{ success }`（取消预览）
- `relaunch-app()` → 写盘后 sync 失败时强制重启

`status`: `up-to-date` | `available` | `error`。`errorCode`: `network` | `forbidden-url` | `verify-failed` | `invalid-catalog` | `schema-too-new` | `no-pending`。缺公钥 / 空 PEM → `verify-failed`。流式超体积 → `invalid-catalog`。

check 的 `diff` 是 `CatalogUpdateDiff`（added / updated / skipped / catalogDropped / **availability**），**不下发 `nextAis` / 目录正文**；added/updated 只有 id / label / url。ours 用 `getEffectiveAIs()`（含已 compose 进列表、但还不在 `user-ais.json` 的官方种子页），不要只用 `user.ais`。apply **先写 user 再写 cache**。写盘成功后 `syncRuntimeViews`；若仍失败则 `restartRequired`，不把已成功的写盘报成 apply 失败。

Modal 面向用户写「列表发生了什么」：新增页、名称/网址、能用的地区（国家名，不是 ISO 码）、将沿用自定义配置的、ChatAIO 已停止维护但仍保留本地数据的。页字段和地区都没变时，明确说经比对没有新增和修改的AI页面；应用更新后仅会添加新AI供应商，不会改变已存在的配置。不要用「保持列表为最新」这种空话。

检查按钮 loading **不用** antd `Button loading`（会往 flex 里插入 spinner 节点，宽度必跳）。文案始终在 DOM 里占位，spinner 用 CSS Grid 叠在同一格（Wes Bos grid-stack / MUI LoadingButton overlay 同思路）。按钮 `disabled` + `aria-busy`；spinner `aria-hidden`。

切入 Manage AIs **不**发检查请求。Settings 切过的页留在树上藏起来，避免表格 + DnD 每次重挂载。目录预览打开或 applying 时侧栏和页脚锁住，Modal 盖住整个 Settings。checking 期间可以切 tab / 用页脚；若检查回来时 Settings 已 dirty，丢掉这次 pending，提示先保存或放弃，不要弹出预览把 chrome 锁死。

## 关键文件

| 路径 | 职责 |
|------|------|
| [`src/Main/services/settings/utils/ai-catalog-update.utility.ts`](../../src/Main/services/settings/utils/ai-catalog-update.utility.ts) | 验签、preview、`createCatalogUpdateCycle`（pending 在实例上） |
| [`src/Main/services/settings/ai-config-service.ts`](../../src/Main/services/settings/ai-config-service.ts) | ours=`getEffectiveAIs`；peek → 写盘 → commit。cycle 方法 private；runtime 经 `forRuntime*` |
| [`src/Main/services/settings/utils/ai-catalog-update-runtime.utility.ts`](../../src/Main/services/settings/utils/ai-catalog-update-runtime.utility.ts) | 全局代理 + 流式限体积；check/apply/discard 串行。IPC 唯一生产入口 |
| [`src/Main/reaxels/Settings/index.ts`](../../src/Main/reaxels/Settings/index.ts) | IPC；apply 成功后 `syncRuntimeViews` |
| [`src/Views/SettingsView/reaxels/settings-view/index.ts`](../../src/Views/SettingsView/reaxels/settings-view/index.ts) | `checkAiCatalog` / `applyAiCatalog`；in-flight 在 `catalog_update` |
| [`src/Views/SettingsView/components/ManageAIs/CatalogUpdate.tsx`](../../src/Views/SettingsView/components/ManageAIs/CatalogUpdate.tsx) | 只渲染；检查按钮 loading 用文案叠层 spinner，不用 antd `loading` |
| [`src/shared/utils/catalog-update-inflight.utility.ts`](../../src/shared/utils/catalog-update-inflight.utility.ts) | `checking` / `applying` 互斥判定；chrome 锁只看 applying / preview |
| [`src/shared/utils/catalog-update-timeout.utility.ts`](../../src/shared/utils/catalog-update-timeout.utility.ts) | fetch / 整次 check / UI watchdog 硬超时；迟到的 reject 必须吞掉 |
| [`tests/ai-catalog-update.test.ts`](../../tests/ai-catalog-update.test.ts) | 业务契约（不打 GitHub） |

## 禁止项

- 启动自动 fetch；不要和 About 的安装包更新混入口。
- 不要在切入 Manage AIs 时自动 check 目录。
- 不要把瘦目录放进 Settings store。
- 不要用 Releases 仓 git 树或 raw.githubusercontent 当 App 下载源。
- **不要把 `ai-catalog` Release 标成 GitHub Latest**（会抢走安装包的 `latest.yml`）。
- 不要为了目录更新改 menubar / FloatingView / AI 页生命周期。
- 不要改 `get-ais` / `get-default-ais` / `reorder-ais` 的返回形状。
- 不要用组件 `useRef` / `useState` 做 check/apply in-flight 锁；锁在 `catalog_update` store。
- 不要把 `beginCatalogCheck` / `checkSignedCatalog` / `applySignedCatalog` 再暴露给 IPC 或其它 reaxel。
- 目录预览未关闭或 applying 时不要允许切 Settings tab / 用页脚退出；必须先应用或取消。不要因为 `checking` 就把 chrome 锁死。
- 取消预览必须丢掉 main pending，不要只清 UI。
- 读 `{ ok:true } | { ok:false; errorCode }` 时必须 `x.ok === false` 收窄，不要 `!x.ok`（本仓 `strictNullChecks: false`，见根 [`CODING_STANDARD.md`](../../../../CODING_STANDARD.md) TypeScript）。
- **禁止 `await session.clearCache()` / `clearStorageData()` 作为目录 fetch 的收尾**（内存 partition 可能永不 resolve，Settings 无限 loading）。
- 禁止只靠 `AbortController` 当 check 超时；必须另有 `Promise.race` 硬超时，且超时后原 Promise 的迟到 reject 要吞掉，避免 `unhandledRejection` 把队列卡死。
- 禁止为每次 check 新建 unique partition 再清 session；复用 `ai-catalog-fetch`。

## 与现有文档

- 三层模型和 merge 规则：[`../architecture/ai-config.md`](../architecture/ai-config.md)、[`../feature-proposal--ai-catalog-source.md`](../feature-proposal--ai-catalog-source.md)
- 排序仍立即写盘：[`ai-list-reorder.md`](./ai-list-reorder.md)
