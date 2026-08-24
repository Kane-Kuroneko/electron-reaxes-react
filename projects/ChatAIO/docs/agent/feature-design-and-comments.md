# 新增功能：设计文档与关键注释

ChatAIO 面向 agent 的交付约定。**新增功能不能只交代码**：必须同时沉淀设计文档，并在关键代码 / 模块写注释。

改代码前读本文；交付前按文末检查清单自检。写法范例见 [`docs/features/ai-list-reorder.md`](../features/ai-list-reorder.md)、[`docs/features/prompt-view.md`](../features/prompt-view.md)。

---

## 必须同时完成的两件事

1. **设计文档**：把动机、不变量、入口、关键文件、禁止项写成独立 markdown，后人按症状能找到。
2. **关键注释**：在模块入口、生命周期、IPC、平台差异、非显而易见约束处写中文注释；注释指向设计文档，而不是复述代码字面意思。

缺任一则视为功能未完成，不要声称「已经落地」。

---

## 何时必须写

以下改动必须新增或更新设计文档，并补关键注释：

- 新的用户可见能力（菜单、Settings、侧栏、快捷键、新窗口 / View）
- 新的运行时模块、IPC 通道、持久化、会话 / 代理 / 分区
- 改窗口 / WebContentsView 生命周期、前台呈现、预加载 park、menubar、FloatingView
- 引入新的跨进程契约、不变量、或「以后不要这么做」的决策

以下可省略**新**文档，但仍须在**已有**文档补一笔（若该路径已有文档）：

- 纯文案、i18n key、样式微调
- 已有文档覆盖范围内的局部 bugfix（在原文「禁止项 / 关键文件」补结果，不要另起一份空文）

不确定时：**写**。短文档优于无文档。

---

## 设计文档放哪

| 性质 | 目录 | 说明 |
|------|------|------|
| 已落地特性 | [`docs/features/`](../features/) | 默认位置。一份功能一份文件，文件名 kebab-case。 |
| 产品 / 运行时结构 | [`docs/architecture/`](../architecture/) | 双层配置、构建、i18n、主壳、menubar 路径等。 |
| 复盘、决策树、禁止项 | [`docs/issues/`](../issues/) | 证伪过的错误路径、回归矩阵、硬性禁止。 |
| 尚未实施的提案 | `docs/` 根下 `feature-proposal--*.md` | 未落地不要放进 `features/`。 |

**禁止**：把设计写进聊天记录、commit message 或超长 PR 描述了事；那些会丢。  
**禁止**：把新功能说明塞进仓库根 `AGENTS.md` 正文。根 `AGENTS.md` 只做全仓库索引；子工程专属内容写进 `docs/`，并把相对链接挂到子工程根 [`AGENTS.md`](../../AGENTS.md) 对应任务 / 症状下（`DOCS.md` 是该文件的别名）。

写完后必须索引：

1. 子工程根 [`AGENTS.md`](../../AGENTS.md) — 有文档就链过去，不要在根 `AGENTS.md` 堆子工程百科。`docs/README.md` 只指向它，不是第二份索引。
2. 不要为了子工程说明去改根 [`AGENTS.md`](../../../../AGENTS.md)，除非全仓库约定变了。

---

## 设计文档写什么

按需取用，不要空章节。至少覆盖：

1. **一句话结论**：这功能是什么、边界在哪。
2. **不变量**：必须永远成立的规则（身份用 `AI.AIItem.id`、IPC 要 `cloneForIPC`、某条 Electron API 禁止调用等）。
3. **入口与数据流**：用户手势 / 菜单 / IPC / 写盘；复杂时用 mermaid。
4. **关键文件表**：路径 + 职责；改代码的人从这里进。
5. **禁止项**：已经否决的做法、平台陷阱、不要复制的邻域逻辑（例如不要把 FloatingView 的 overlay 逻辑抄到中心 WCV）。
6. **与现有文档的关系**：先读哪篇、本文不取代哪篇。

改已有功能时**更新原文**，不要平行再写一份「v2」除非架构已被推翻（推翻则在旧文顶部标明过时，并链到新文）。

---

## 关键代码 / 模块注释

注释规范的字面格式仍遵守根目录 [`CODING_STANDARD.md`](../../../../CODING_STANDARD.md)（中文行内注释；工具函数 JSDoc）。本文要求的是**写在哪、写什么**。

### 必须注释的位置

- **模块入口**（`reaxel_*`、`*View` 根文件、服务 `index.ts`）：这段代码负责什么、不负责什么、设计文档路径。
- **生命周期与布局**：`present` / `park` / `fitWindow` / `setBounds` / 显隐 / 节流 — 写清不变量和禁止项，避免后人「顺手优化」踩坑。
- **IPC 与持久化边界**：通道含义、payload 是否必须 `cloneForIPC`、谁写盘、谁只回显。
- **平台差异**：Windows / macOS 行为分叉、禁止的 Electron API（如 Windows FloatingView 禁止 `forward: true`）。
- **非显而易见的约束**：时序、竞态、为什么不能 focus、为什么接受第一次 present 卡顿等。

### 怎么写

```typescript
/**
 * Switch AI 排序写盘。菜单只提交 enabled id；disabled 下标由 mergeEnabledAIOrder 钉住。
 * 设计：docs/features/ai-list-reorder.md
 */
```

```typescript
// 回前台且层级健康时默认 no-op。禁止在 restore/show 上 webContents.focus()（electron#28163）。
// 见 docs/issues/ai-view-foreground-white-flash.md
```

### 不要写

- 复述下一行代码字面意思（`// 返回结果`）
- 把整篇设计文档粘进源码
- 用英文注释堆砌已知 API 行为（本工程行内注释用中文）

---

## 交付检查清单

新增或明显扩展功能时，agent 在收工前确认：

- [ ] `docs/features/`（或 architecture / issues）已有对应设计文档，或已更新既有文档
- [ ] 子工程根 [`AGENTS.md`](../../AGENTS.md) 本工程段已索引；全仓库不变量不必写进根 [`AGENTS.md`](../../../../AGENTS.md)
- [ ] 模块入口、生命周期、IPC、平台分叉处已有中文注释，并指向该文档
- [ ] 禁止项写进文档，而不是只写在这次对话里
