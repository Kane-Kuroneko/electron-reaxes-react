# 升级后 AI 登录会话丢失

> 状态：根因已确认（2026-09-02）。修复未落地。
> 关联：[`../architecture/ai-config.md`](../architecture/ai-config.md)、[`../feature-proposal--update-session-backup.md`](../feature-proposal--update-session-backup.md)

## 结论

安装程序**没有**清空 AppData。有 `user-ais.json` 时，新包仍打开**原来的** `persist:chataio-ai-<旧id>`。启动预加载会对这些页 `loadURL`，站点用 `Set-Cookie` 把未登录 Cookie 写进**同一份** `Network/Cookies`，旧登录就被盖掉。

没打开过的页（本机关掉的 Grok）Cookie 还在。被预加载打开的页找不回来，只能重新登录。不要 Reset All。

上次正式版是 **1.0.5（2026-07-30）**。这次包隔了两个月，多了两件旧版没有的事：

1. **8-10** 起每个 AI 页都伪装成 Chrome（UA / Sec-CH-UA）。站点常把登录绑在浏览器指纹上，指纹一变就发新 Cookie。
2. **8-28** `f88893883` 把官方种子 id 改成供应商 UUID。`composeEffectiveAIs` 只认精确 id，会在列表**末尾追加**一套空的官方页。无 `user-ais.json` 的用户会整表切到 UUID 空分区。

本机 09-01：20:16 新 exe 启动仍读旧配置；20:17 已在写旧 chatgpt 分区。末尾 UUID 页当时还没有对应分区，不是默认打开的那几页。

## 不要做

- 启动时 `clearStorageData`
- 按 family 合并多开会话
- 整树备份 `Partitions/` 再还原后立刻 `loadURL`（会被再盖一次）

## 应修（未落地）

1. 同 family 已有 `default-*-001` 时，不要再追加 UUID 空种子。
2. 若要统一 id：rename 分区，不要静默换 id。
3. 升级后第一次 apply 不要无故 `reloadIgnoringCache`。
4. 身份 / 指纹变更视为会掉登录，不要默认开在所有已有分区上。

## 关键文件

| 文件 | 职责 |
|------|------|
| `src/Main/reaxels/Views/utils/initWebContentsView.ts` | `useAIView` 对旧 partition `loadURL` |
| `src/Main/reaxels/Views/AI-Views/index.ts` | `getAIPartition`、preload、`reloadIgnoringCache` |
| `src/Main/services/browser-identity/index.ts` | 每个 AI session 改 UA / Sec-CH-UA |
| `src/Main/services/settings/utils/ai-catalog-merge.utility.ts` | 按精确 id 追加 UUID 种子 |
