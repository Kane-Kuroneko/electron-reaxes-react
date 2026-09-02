# 提案：升级前备份 / 升级后还原 AI session

> 状态：调研完成，**未落地**。不是「升级掉登录」的主修复。
> 关联：[`issues/ai-login-session-lost-after-catalog-uuid.md`](./issues/ai-login-session-lost-after-catalog-uuid.md)、跨机搬运见 [`feature-proposal--cross-instance-session-migration.md`](./feature-proposal--cross-instance-session-migration.md)

## 结论

本机升级：**备份做得到，但挡不住这次已经发生的覆盖。**  
NSIS / electron-updater 本来就不清 `userData`。这次是新 exe `loadURL` 后站点 `Set-Cookie` 写进旧 sqlite。还原完再立刻打开页面，会被再盖一次。

主修复仍是：不要追加 UUID 空种子、不要无故 `reloadIgnoringCache`、统一 id 时 rename 分区。备份只做安全网。

## 若做

- 只快照登录相关：`Network/Cookies`、Local Storage、IndexedDB。本机 `Partitions/` 约 4.8 GB，绝大部分是 Cache / Code Cache，不要整树拷。
- Cookie 用 `cookies.flushStore()` + `cookies.get({})` 写成 JSON（主进程能拿到 HttpOnly）。`get` 的对象不能原样 `set`。
- 文件拷必须在 WebContents 关掉、锁释放之后。开着页面拷 Cookies+WAL 会得到坏库，新进程会静默丢掉登录。
- 手装 NSIS 会杀掉旧进程，更新钩子跑不完 → **平时退出就快照**，更新只用最近一份。
- 还原：文件须在第一个 `fromPartition` 之前；cookie JSON 若要救「被站点盖掉」，须在 `loadURL` **之后**再灌并 reload（token 仍有效才行）。只跑一次，不要每次启动用备份盖生产分区。

不要在 NSIS `customInstall` 里碰 cookie。不要按 family 把多开实例灌进同一分区。
