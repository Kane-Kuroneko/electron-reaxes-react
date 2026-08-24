# AI 列表排序

Switch AI 菜单与 Settings → Manage AIs 共用一套**立即持久化**的顺序模型。顺序就是 `user-ais.json` 里 `ais` 数组下标，没有独立 `order` 字段。

改交互或 `reorder-ais` 前先读本文，并跑 `yarn test:ai-order`（在 `projects/ChatAIO`）。

## 不变量

1. **菜单顺序 = 持久化 `AIs` 数组顺序**，disabled 项不出现在 Switch AI。
2. **排序松手即写盘**。Settings 拖拽不再进入 Apply dirty；启用 / 改名 / 删除仍要 Apply。
3. **左键切 AI，右键拖排序**。Application / View 菜单、Switch AI 底栏 Prev/Next 不参与拖拽。
4. **禁止**为排序改 menubar `-webkit-app-region: drag` 或 FloatingView `forward: true`。排序只发生在 Dropdown 窗口或 Settings 表内。
5. Renderer → Main 的 id 列表必须 `cloneForIPC`。

## 两条入口

```mermaid
flowchart TD
  switchAi["Switch AI 右键拖 enabled 项"]
  settings["Manage AIs 左键拖整表"]
  rpc["reorder-ais string[]"]
  resolve["resolveReorderedAIs"]
  disk["replaceAllAIs / user-ais.json"]
  menu["rebuildMenu"]
  echo["ais-order-changed 仅当 sender 不是 Settings"]

  switchAi --> rpc
  settings --> rpc
  rpc --> resolve
  resolve -->|"全表 id 置换"| disk
  resolve -->|"enabled id 槽位合并"| disk
  resolve -->|"集合对不上"| reject["不写盘"]
  disk --> menu
  disk --> echo
```

| 入口 | 手势 | payload | 写盘结果 |
|------|------|---------|----------|
| Switch AI | 右键按住，移动 ≥ 8px | 当前 enabled id 序列 | disabled 下标不动，enabled 按菜单新序填回 |
| Manage AIs | 表行拖拽 | **已提交**全表 id（含 disabled / 待删除，不含未 Apply 的新建项） | 整表按该序 |

全部 enabled 时两种 payload 集合相同，结果一致。

例：磁盘 `[A, B(disabled), C, D]`，菜单重排 enabled 为 `[D, C, A]` → `[D, B(disabled), C, A]`。

## IPC

- RPC `reorder-ais(orderedIds: string[]) → { success, error? }`
- MTR `ais-order-changed(orderedIds)`：把 menubar 新序同步进已打开的 Settings store
- **不要**在 Settings 自己调用 `reorder-ais` 后再 echo 回 Settings：会盖掉未保存新建项，或打断连续拖拽

## Settings dirty

`buildDirtySettingsSnapshot` 对 `AIs` 做 `snapshotAIsForDirty`（去掉待删除行，顺序不计）。只改顺序不会点亮 Apply；改名 / 启用禁用 / 待删除仍 dirty。Discard / 退出仍 `reloadSettings`，磁盘上已是新序。

## 测试锁定的契约

`yarn test:ai-order` 按**用户可见结果**锁下面几条，不锁内部「槽位合并 / 全表置换」函数切分，也不锁 dirty 是否按 id 排序：

1. Switch AI 只给 enabled id → disabled 下标不动，字段跟着 id 走。
2. Settings 给已提交全表 id（含 disabled、含待删除、不含未 Apply 新建项）→ 整表按该序。
3. payload 集合对不上（含「enabled 里夹了 disabled 但不是全表」）→ 不写盘。
4. 未 Apply 新行误进 payload → 拒写；过滤后再套回本地，新行仍在原槽。
5. 顺序变化不 dirty；改名 / disabled / 待删除 dirty。
6. Settings 自己是 `reorder-ais` 的 sender 时不 echo `ais-order-changed`。

左键切页、右键拖、footer 钉死是 DropdownView 手势，本 suite 不覆盖。

## 关键文件

| 路径 | 职责 |
|------|------|
| [`src/shared/utils/merge-enabled-ai-order.utility.ts`](../../src/shared/utils/merge-enabled-ai-order.utility.ts) | 写盘 / dirty / echo / Settings payload 的产品契约函数 |
| [`src/Main/services/settings/ai-config-service.ts`](../../src/Main/services/settings/ai-config-service.ts) | `reorderEnabledAIs` |
| [`src/Main/reaxels/Settings/index.ts`](../../src/Main/reaxels/Settings/index.ts) | IPC、rebuildMenu、按需 echo |
| [`src/Views/DropdownView/App.tsx`](../../src/Views/DropdownView/App.tsx) | 右键 sensor、AI / footer 分区 |
| [`src/Views/DropdownView/right-click-mouse-sensor.utility.ts`](../../src/Views/DropdownView/right-click-mouse-sensor.utility.ts) | 只激活 `button === 2` |
| [`src/Views/SettingsView/reaxels/settings-view/index.ts`](../../src/Views/SettingsView/reaxels/settings-view/index.ts) | `persistCommittedAIOrder` / `applyExternalEnabledAIOrder` |
| [`tests/ai-list-reorder.test.ts`](../../tests/ai-list-reorder.test.ts) | 产品契约回归（不是内部 helper 快照） |

## 禁止项

- 不要用 HTML5 `draggable` 或默认 `PointerSensor` 做 Switch AI 排序（只认左键）。
- 不要让 Settings 拖拽只改 store 等 Apply：会和 menubar 立即写盘打架。
- 不要把未 Apply 的新建 AI id 送进 `reorder-ais`。
- 不要把待删除行从 Settings 排序 payload 里滤掉：它们仍在磁盘上，滤掉会退化成菜单槽位合并。
- 不要为排序给 Dropdown 加 `app-region: drag`。
- 不要把测试写成内部 helper（`mergeEnabledAIOrder` / `isIdPermutation`）的黄金输出快照。
