# GuidingView 产品评审分析

## 一、产品意图理解

ChatAIO 是一个 Electron 宿主，在一个窗口内管理多个 AI 网页服务（ChatGPT、Claude、Gemini、Grok 等），让用户按配置顺序切换而非在浏览器标签页之间跳转。

**GuidingView** 是首次启动时的三步入职向导，在 `isFirstLaunchWithoutUserData`（`userData` 目录不存在）时触发：

| 步骤 | 内容 | 核心动作 |
|------|------|---------|
| Step 0 — 偏好 | 语言选择 + 主题选择 + 4 张功能介绍卡片 | 设置外观偏好 |
| Step 1 — 网络 | 三目标连通性测试（Google/X/YouTube）+ 手动选直连/需代理 | 判断网络环境 |
| Step 2 — AI 页面 | 勾选内置 AI + 添加自定义 AI URL | 选择启用哪些 AI |

完成后调用 `guiding-finish` IPC → 保存设置/AI 配置 → 销毁 GuidingView 窗口 → 启动主运行时。

---

## 二、关键问题（按严重度排序）

### 🔴 P0 — 流程阻断：网络受限用户无法进入 AI 页面选择步骤

**代码位置**：`components/Footer/index.tsx:23`

```typescript
{ page < 2 && canDirectConnect !== false && <Button
   type="primary"
   disabled={ page === 1 && store.UIControls.network.status === 'unknown' }
   onClick={ goNext }
><I18n>Next</I18n></Button> }
```

当 `canDirectConnect === false`（即连通性测试失败，或用户手动选择了"需要代理"），Step 1 的 **"Next"按钮被隐藏**，取而代之的是一个长按"保存并打开设置"按钮。用户**完全无法进入 Step 2 选择 AI 页面**。

**后果**：对于国内大量需要代理访问国际网络的用户，入职向导在第二步就终止了。他们无法：
- 选择启用哪些 AI
- 添加自定义 AI
- 完成完整的入职流程

唯一的出路是长按"跳过"（跳过整个向导，保存空进度），或进入设置面板手动配置——这对新手用户极其不友好。

**产品逻辑问题**：网络状态检测的目的是**帮助初始化代理默认值**，而不是**决定用户能否选择 AI**。"网络需要代理" ≠ "用户不想选 AI"。这两个步骤应该有条件依赖（网络结果影响代理默认值），但不应该有流程阻断。

---

### 🔴 P0 — 进度丢失：关闭窗口后已保存的进度不会被恢复

已在 `fixme.md` 记录为 **P2-08**，但我认为实际严重度应为 **P0**：

**根因**：
- `goNext()` 在 Step 0→1 和 Step 1→2 时调用了 `saveProgress()`，进度实际已持久化到 `user-settings.json`
- 但 `reloadDefaults()` 调用 `get-guiding-defaults` IPC，返回的是**出厂默认值**，不含之前保存的 progress
- 渲染进程没有从主进程读取已保存进度并合并到 UIControls 的逻辑

**场景**：用户完成了 Step 0（选了日语+深色主题），进入 Step 1，不小心关闭窗口。重新打开时，所有选择丢失，语言回到 Follow System，主题回到 System。

**讽刺之处**：数据已经被保存了，只是没人读它。

---

### 🟡 P1 — 体验断裂：从向导直接跳入完整设置面板

当 `canDirectConnect === false` 时，用户长按"保存并打开设置"触发：
```
guidingFinish({ openSettings: true })
→ startMainRuntime({ openSettings: true })
→ openSettingsView()
```

用户从一个**专注、线性的步骤向导**（独立窗口，960×680，干净布局）突然被丢进**完整的设置面板**（嵌入主窗口的 WebContentsView）。此时用户：
- 还没见过主界面长什么样
- 不知道设置面板和主窗口的关系
- 面对一个复杂的多标签设置面板（General/Network/Manage AIs/About），上下文完全断裂

**改进方向**：要么让用户完成向导后在主界面中自然发现设置入口，要么在进入设置时给一个明确的过渡说明。

---

### 🟡 P1 — 无确认总结：长按完成后直接消失

Step 2 的"长按确认完成"按下 900ms 后，向导窗口直接关闭，主应用窗口弹出。用户**没有任何机会回顾自己配置了什么**：
- 选了哪些语言/主题？
- 网络被判定为什么状态？
- 启用了哪些 AI？添加了哪些自定义 AI？
- 各有什么含义？

**对比优秀实践**：macOS 设置向导、VS Code 初次启动、1Password 入职——都有"你即将完成设置，以下是你选择的摘要"的确认步骤。

---

### 🟡 P1 — "Skip" 语义模糊

Footer 中的"长按跳过"按钮，调用 `finish({ skip: true })`。但查看主进程处理：

```typescript
// Guiding-View/index.ts:42-58
useIpcRpc('guiding-finish').handle(async ({ event }, options) => {
   saveGuidingProgress(options?.progress || {});
   // ...
   await startMainRuntime({ openSettings: options?.openSettings === true });
});
```

`skip: true` 在 finish 流程中**没有产生任何差异化行为**——它和正常 finish 走完全相同的路径。用户点击"跳过"时，传递的是 `buildProgress()` 的结果（可能为空 progress），本质上等同于"放弃我当前步骤的配置直接完成"。

用户的自然理解会是："跳过 = 使用默认值完成剩余配置"——但实际是"跳过 = 丢弃已做配置 + 用空值覆盖"。命名与实际行为严重不符。

---

### 🟡 P1 — 自定义 AI 缺乏输入验证和引导

`components/AIPages/index.tsx` 中，自定义 AI 只做了 `trim()` 和空值检查（`addCustomAI` 函数第 202-203 行）。用户可以输入：
- 无效 URL：`"not a url"` → 静默添加，后续加载时出错
- 非 AI 网站：`"https://baidu.com"` → 功能上能加载，但产品定位偏离
- 阻止嵌入的网站：许多网站设置了 `X-Frame-Options`，在 WebContentsView 中加载会失败

没有：
- URL 格式验证
- URL scheme 检查（只应允许 https）
- 对"什么是自定义 AI"的解释
- 自定义 AI 的权限/限制说明

---

## 三、次要 UX 问题

### 🟠 P2 — 连通性测试的目标选择不具代表性

```typescript
const connectivityTargets = [
   { id: 'google', url: 'https://www.google.com/generate_204' },
   { id: 'x', url: 'https://twitter.com' },
   { id: 'youtube', url: 'https://www.youtube.com' },
];
```

三个目标全是 Google 相关（YouTube 也是 Google 旗下）。如果只有 Google 被墙而 Twitter 正常（或反过来），判断结果就不准确。更合理的做法是选择**不同运营商的代表性目标**，至少包含一个非 Google/非 Twitter 的独立站点。

另外，"≥2/3 成功 = canDirectConnect"的阈值缺乏说明。对于部分可达的网络（如 DNS 污染导致间歇性失败），一刀切的二分判断不够细粒度。

---

### 🟠 P2 — 开发者测试 AI 出现在用户列表中

`default-ais.json` 中有一个 `"ChatAIO (Proxy Test)"` (id: `default-dev-proxy-test-001`)，`AI_family: 'dev-proxy-test'`，URL 指向 `whatismyipaddress.com`。它在 GuidingView 的 AI 选择页面中和其他 AI 一样展示，用户会困惑：这是什么东西？为什么叫 "ChatAIO" 但它不是聊天 AI？它应该被标记为开发者工具或在生产构建中排除。

---

### 🟠 P2 — 长按按钮行为不一致

| 按钮 | 需要长按 | 原因 |
|------|---------|------|
| 跳过 | ✅ 900ms | "危险操作" |
| 保存并打开设置 | ✅ 900ms | "危险操作" |
| 完成 | ✅ 900ms | "危险操作" |
| 下一步 | ❌ 单击 | — |
| 上一步 | ❌ 单击 | — |

但"下一步"（Step 0→1）**自动保存并进入下一步**——和"完成"一样是不可逆操作（设置已写入磁盘）。如果"防误触"是设计理由，那么所有具有持久化效果的操作都应该一致地使用长按，或者都不使用。

另外，LongPressButton 的 `props` 类型是 `any`，没有任何类型约束。

---

### 🟠 P2 — 缺少键盘导航

整个向导仅支持鼠标/触摸操作。没有：
- Enter 键触发"下一步"
- Escape 键触发"上一步"或"跳过"
- Tab 键在表单控件间导航
- 屏幕阅读器友好的 ARIA 标签

这对有键盘偏好的用户和辅助技术使用者是基本无障碍问题。

---

### 🟠 P2 — 步骤间保存时无 loading 反馈

```typescript
async function goNext() {
   if (store.Page.current === 0) {
      await saveProgress({ appearance: { ... } });  // 异步 IPC，无 spinner
      setState.Page({ current: 1 });
   }
}
```

`saveProgress` 是异步 IPC 调用，但按钮没有 loading 状态。在网络慢或磁盘 I/O 阻塞时，用户可能点击多次或以为应用卡住了。

---

### 🟠 P2 — AI 选择列表无全选/取消全选

7 个内置 AI + 可能的多个自定义 AI，逐个勾选。没有：
- "全选" / "取消全选" 按钮
- 已选数量提示（"已选 5/7"）
- 按类别分组

---

### 🟠 P2 — 添加自定义 AI 后无法编辑

添加后展示为卡片，只有"移除"按钮。如果输错了名字或 URL，只能删除重建。

---

## 四、架构/技术层面

### 🟡 P1 — `isFirstLaunchWithoutUserData` 检测不够健壮

```typescript
export const isFirstLaunchWithoutUserData = !fs.existsSync(app.getPath('userData'));
```

只检查目录是否存在。如果目录存在但为空（被其他应用创建）、或目录存在但 `user-settings.json` 不存在，都不会触发向导。更合理的做法是检查**关键设置文件是否存在且有有效内容**。

### 🟡 P1 — GuidingView 作为独立 BrowserWindow 造成的体验断裂

GuidingView 是独立 `BrowserWindow`（960×680，无菜单栏），主应用是另一个 `BrowserWindow` + `WebContentsView` 子视图。过渡时：
- GuidingView 窗口被销毁
- 新主窗口被创建
- 出现视觉跳跃

无法实现平滑过渡动画。这是架构决定的限制，但如果未来产品要求更好的入职体验，需要考虑统一窗口模型。

### 🟠 P2 — `cloneForIPC` 使用不一致

GuidingView 中使用了 `cloneObservableToPlain` 来克隆进度数据，而文档和 SettingsView 中使用的是 `cloneForIPC`。命名不统一，`cloneObservableToPlain` 这个名称也没有出现在 IPC 编码规范中。

### 🟠 P2 — i18n 资源孤立

GuidingView 和 SettingsView 各自维护独立的 i18n reaxel 和语言资源文件（已在 fixme.md P2-07 记录）。两个模块有相同的翻译 key（如 "Language", "Theme", "Dark", "Light"），但分布在不同的文件中。如果新增一个语言，需要在两处同时更新。

---

## 五、缺失的特性（机会点）

1. **入职后可重新访问**：目前一旦完成向导，无法重新体验。对于想重新配置的用户，只能手动去设置面板逐项修改。

2. **步骤间动画过渡**：页面切换是瞬间的 `setState.Page({ current: N })`，没有滑入/淡入动画。加上过渡动画会显著提升品质感。

3. **网络测试结果的可视化**：当前测试结果以纯文本列表展示（target name + OK/Failed）。可考虑进度条、信号强度图标等方式让结果更直观。

4. **独立 AI 的简介**：AI 选择列表中，每个 AI 只有名称和 URL。对于不熟悉某些 AI 的用户（如 Perplexity），没有一句话简介说明它是做什么的。

5. **步骤条件跳过**：如果系统语言已经是期望的语言、主题已经是期望的主题，Step 0 的意义就弱化了。可以考虑智能检测并自动跳过已经满足最佳实践的步骤。

---

## 六、总结：最应该优先修复的问题

| 优先级 | 问题 | 影响面 |
|--------|------|--------|
| **P0** | 网络受限用户无法进入 AI 选择步骤 | 大量国内用户入职流程被截断 |
| **P0** | 关闭窗口后进度丢失 | 所有用户都可能遇到，且数据实际已保存 |
| **P1** | 从向导直接跳入复杂设置面板 | "网络受限"路径的用户体验断裂 |
| **P1** | 完成前无确认/总结步骤 | 用户不记得自己配置了什么 |
| **P1** | "跳过"语义和实际行为不符 | 用户心智模型混乱 |
| **P1** | 自定义 AI 无输入验证 | 用户可能添加无效 AI，后续加载出错 |

核心矛盾在于：**网络检测步骤的角色被过度放大**——它从一个"辅助判断代理默认值"的辅助工具，变成了"决定用户能否走完向导"的看门人。这违背了向导的设计初衷：帮助用户完成初始配置，而不是在过程中制造死胡同。
