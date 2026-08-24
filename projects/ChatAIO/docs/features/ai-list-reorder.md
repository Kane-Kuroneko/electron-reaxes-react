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

| 入口 | 手势 | payload | 写盘算法 |
|------|------|---------|----------|
| Switch AI | 右键按住，移动 ≥ 8px | 当前 enabled id 序列 | `mergeEnabledAIOrder`：disabled 下标不动 |
| Manage AIs | 表行拖拽 | **已提交**项的全表 id（含 disabled，不含未 Apply 的新建项） | 全表置换 |

全部 enabled 时两种 payload 集合相同，结果一致。

例：磁盘 `[A, B(disabled), C, D]`，菜单重排 enabled 为 `[D, C, A]` → `[D, B(disabled), C, A]`。

## IPC

- RPC `reorder-ais(orderedIds: string[]) → { success, error? }`
- MTR `ais-order-changed(orderedIds)`：把 menubar 新序同步进已打开的 Settings store
- **不要**在 Settings 自己调用 `reorder-ais` 后再 echo 回 Settings：会盖掉未保存新建项，或打断连续拖拽

## Settings dirty

`buildDirtySettingsSnapshot` 对 `AIs` 做 `canonicalizeAIsForDirtySnapshot`（按 id 排序）。只改顺序不会点亮 Apply。Discard / 退出仍 `reloadSettings`，磁盘上已是新序。

## 关键文件

| 路径 | 职责 |
|------|------|
| [`src/shared/utils/merge-enabled-ai-order.utility.ts`](../../src/shared/utils/merge-enabled-ai-order.utility.ts) | 纯函数 + 测试锁定的写盘决策 |
| [`src/Main/services/settings/ai-config-service.ts`](../../src/Main/services/settings/ai-config-service.ts) | `reorderEnabledAIs` |
| [`src/Main/reaxels/Settings/index.ts`](../../src/Main/reaxels/Settings/index.ts) | IPC、rebuildMenu、按需 echo |
| [`src/Views/DropdownView/App.tsx`](../../src/Views/DropdownView/App.tsx) | 右键 sensor、AI / footer 分区 |
| [`src/Views/DropdownView/right-click-mouse-sensor.utility.ts`](../../src/Views/DropdownView/right-click-mouse-sensor.utility.ts) | 只激活 `button === 2` |
| [`src/Views/SettingsView/reaxels/settings-view/index.ts`](../../src/Views/SettingsView/reaxels/settings-view/index.ts) | `persistCommittedAIOrder` / `applyExternalEnabledAIOrder` |
| [`tests/ai-list-reorder.test.ts`](../../tests/ai-list-reorder.test.ts) | 回归 |

## 禁止项

- 不要用 HTML5 `draggable` 或默认 `PointerSensor` 做 Switch AI 排序（只认左键）。
- 不要让 Settings 拖拽只改 store 等 Apply：会和 menubar 立即写盘打架。
- 不要把未 Apply 的新建 AI id 送进 `reorder-ais`。
- 不要为排序给 Dropdown 加 `app-region: drag`。
