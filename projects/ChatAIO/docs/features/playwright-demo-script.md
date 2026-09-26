# ChatAIO 产品演示出镜脚本

给 OBS 录屏用的**分镜与叙事**，不是架构、也不是 E2E。实现仍走 `yarn demo:playwright`；导演层怎么跑见 [`playwright-demo-record.md`](./playwright-demo-record.md)。

本稿只定「拍什么、什么顺序、什么不要进画面」。节奏要对标成片：滑到就点、只在结果上停；`--pace` 只做整片倍率，不要为了「一条过」加暗夜模式或向导页。

## 一句话结论

一条 take、浅色英文主壳：六家最流行的 AI 全部启用且启动预加载；从中区 badge 亮出列表、切两家，再用 menubar Prev/Next 来回走；左侧 Prompt 写一条、带着侧栏连切三次，Copy 后贴进当前 AI 输入框；最后进 Settings 看全局代理和按页覆盖。全程浅色，不拍 Dark。

## 不变量

1. **语言 en-US、主题 Light。** 菜单 `data-item-id`、role 名、Settings 文案都按英文拍。禁止 Follow System（Windows 系统深色会把壳打黑）。禁止任何 Dark / 主题闪切。
2. **六家 AI 全部启用 + `preloadOnStartup: true`。** 切页必须是「已经暖好的站」，不要现场从空白加载。登录态留在 `demo/.profile/`，脚本不登账号。
3. **不对远程站点写各家 CSS 选择器。** 站点只当背景。贴进输入框：Prompt 卡片 Copy → 通用探测当前页可见的 textarea / contenteditable / textbox（**排除** email/password/用户名），点中后用 CDP `insertText`。未登录时输入框常在中部英雄区，不要死点下三分之一（容易点到 Log in）。禁止 `Control+V`（Chromium 合成按键常常不会真粘贴）。
4. **GuidingView 不出镜。** 画像事先 seed 成返回用户。需要重做向导时用 `--reset-profile`，那是备带，不是本片。
5. **主路径用 badge 和 menubar Prev/Next**，不用 Switch AI 里的 Alt+]「新开一页」、也不用 Ctrl+] 浮层卡片（卡片会挡住站点，列表故事已经用 badge 讲完）。
6. **下拉里点哪一项，光标就出现在哪一项上直接点，禁止从上到下滑过列表。** 点击当下要有光点（ripple），不要靠扫过条目来「找到」目标。
7. OBS **不要** Capture Cursor（壳层已有演示光标）。Canvas 等于窗口客户区，禁止把 1600×900 强行放大成 1080p。

## 预先准备（开录前，可不出镜）

### 六家 AI

按 2026 年公开份额（ChatGPT / Gemini / Claude 稳居前三；其后在 Copilot、Grok、Perplexity、DeepSeek 之间）**和本产品 bundled 目录里真实有的页**取交集。不选 Copilot：它更像系统嵌入，出镜辨识弱于独立站点；DeepSeek 在目录里是一等公民，也能带出「中美站点同一壳」。

出镜顺序 = `user-ais.json` 数组序（badge / Prev / Next 都跟这份序）：

| 序 | family | 出镜名 | URL |
|----|--------|--------|-----|
| 1 | `chatgpt` | ChatGPT | `https://chatgpt.com` |
| 2 | `gemini` | Gemini | `https://gemini.google.com/app` |
| 3 | `claude` | Claude | `https://claude.ai` |
| 4 | `deepseek` | DeepSeek | `https://chat.deepseek.com` |
| 5 | `grok` | Grok | `https://grok.com` |
| 6 | `perplexity` | Perplexity | `https://www.perplexity.ai` |

其余目录项（Manus、AI Studio、Poe…）**不要出现在 Switch 列表里**（`disabled: true` 或不写入启用表）。`dev-proxy-test` 删掉。

每条：`disabled: false`，`preloadOnStartup: true`，`proxy_mode: follow_global_setting`。启动策略 `last-used-ai`，冷启动落在 ChatGPT。

人要先在 `demo/.profile` 里把这六家都登进可聊天的状态。脚本只负责壳层手势。

### 浅色 + 英文

- `appearance.theme: light`，`darkmode: false`，`language: en-US`
- `CHATAIO_DEMO=1` 已在 prelaunch / Guiding defaults 钉浅色；本片根本不进 Guiding
- 全局代理预置成 **Direct**，Settings 段再把四种模式扫一遍（不要在片里填真实账号密码）

### 窗口宽高

要 16:9，方便 YouTube / B 站 / 官网横版，OBS 1:1 采集、不放大。

| 候选 | 何时用 |
|------|--------|
| **1920×1080** | 主显示 `workArea` 放得下。1080p 发行不必缩放，字最利。 |
| **1600×900** | 常见 1080p 屏扣掉任务栏后高度约 1040，放不下 1080 窗体。仍是 16:9。 |
| **1280×720** | 更小的 workArea。最低可用，字偏大、站点内容少。 |

**算法（实现必须照做）：** 在 `[1920×1080, 1600×900, 1280×720]` 里取能放进 `screen.getPrimaryDisplay().workAreaSize` 的最大一档；居中；已是该尺寸不要再 `setSize`/`center`（会触发 `move` 把 Dropdown 关掉）。不要用「workArea 最大 16:9 怪尺寸」（例如 1856×1044）——OBS 预设对不上，后期还得裁。

不要大于 1920×1080：4K 采集对演示没有收益，站点 UI 在成片里偏小，编码更重。

menubar 固定 36px。Prompt 展开后中区变窄，1920/1600 仍能同时看见侧栏和站点 composer；720p 只在小屏兜底。

**OBS：** Base Canvas = 窗口客户区；Output 同尺寸；Game/Window Capture 本窗；关闭 Capture Cursor。

## 出镜叙事（一条 take）

默认 playlist 应改成下面五段。段与段之间约 0.5s 给 OBS 下刀，故事连续：同一个浅色窗、同一颗光标。

片里只打英文 UI。下面「旁白」是剪辑时可用的一句，不是屏上字幕（除非后期自己加）。

### 节奏（像人，不要空镜）

对标 Screen Studio Rapid / 常见 SaaS 发布片：

1. **光标只为下一次点击移动。** 禁止「先滑到按钮上停 2 秒再点同一颗」。第一次出场从目标旁边滑入，不要从窗口左上角飞过来。
2. **走位按时长 ∝ 距离。** 短距离几乎不滑；已经在目标上（连点 Next）直接再点。长距离一条微弧滑过去，到了就点。
3. **只在观众要读的结果上停：** 第一次打开六家列表（约 0.8s）、切到新 AI 出画（预算约 0.55s，含切换本身）、贴进输入框（约 0.8s）、Manual 表单 / Edit 弹窗（约 0.4s）。其它点击只留 UI 吃掉事件的几十毫秒。
4. **同一张列表再打开**约 0.25s 点名即可，不要每次都让人重新读一遍。
5. **waitFor 已经占用了 dwell。** 切页等快照花掉的时间要从 hold 里扣掉，禁止「等完再空等 1.7s」。
6. **打字像人：** 词内较快，空格/标点略顿。Prompt 打完扫一眼就去切页，不要盯着 textarea。

### 0. 建立镜头（preroll ~0.5s）

主窗已是浅色英文，当前 AI = ChatGPT，六页预加载完成。**光标已经停在中区 badge 上**（不是等第一击才出现）。不要从向导或空白加载开始，也不要在 badge 上再干等。OBS 不要 Capture Cursor，避免和这颗 overlay 叠成双光标。

旁白（可选）：*One window. Every AI you already use.*

### 1. Badge 打开列表

光标从中区 **Current AI** badge 旁滑入即点（`data-testid=current-ai-badge`）。下拉是精简 Switch AI：只有六家 logo + 名称，没有 Prev/Next Page。第一次停住让列表被看清（约 0.8s）。不要立刻点第一项。

这一镜卖的是「所有常用 AI 在同一菜单里」，不是快捷键。

### 2. 从列表切两家

仍在这张下拉里点 **Gemini**，preload 应很快，站点一出画就看一眼。再开 badge（列表已经认识，约 0.25s），点 **Claude**。两次都要从列表点名，不要用 Next 偷懒——观众需要看见「点谁就是谁」。光标**不要**从列表顶滑到目标行：下拉停稳后，光标出现在该行上直接点，点下去要有光点。

不要连点超过两家：列表故事到此结束，后面交给 Prev/Next。

### 3. Prev / Next

用 menubar **两侧相邻按钮**（`prev-instantiated` / `next-instantiated`）：带对方 logo 和名字的 chevron，不是 Application 菜单。

建议手势（当前在 Claude）：

1. **Next** → DeepSeek  
2. **Next** → Grok（光标留在 Next 上再点，不要挪走再滑回来）  
3. **Prev** → DeepSeek（横滑到另一侧 chevron）

停顿以站点出画为准，不要等网络转圈，也不要切完再空等。三下足够证明双向；不要把六家走成阅兵。

### 4. 左侧 Prompt：写、带着切、贴进输入框

1. View → **Prompt Left**（或菜单等价项 `prompt-left`）。侧栏顶开中区，当前仍是 DeepSeek。打开后直接写，不要空等。
2. 在第一张卡片 textarea 里按词打这一条（短、能看清、贴进任何一家都不尴尬）：

   `Compare the last three answers. List agreements, contradictions, and one question to ask next.`

3. **侧栏保持打开**，扫一眼已写的字，再切 3 次（Next → Grok → Perplexity → ChatGPT，或从当前序接着走）。卖点是：Prompt 不绑 `AIItem.id`，换站文字还在。
4. 点该卡 **Copy**（`aria-label=Copy`），马上贴，不要 Copy 后再停一拍。
5. 点当前 AI 页里**探测到的输入框**（未登录多在中部；已登录多在底部）。避开登录邮箱/密码。若当前页是登录墙（例如 DeepSeek `/sign_in`）没有 guest composer，就 Next 直到找到可见输入框再贴。Copy 后先 focus 再 `insertText` / `execCommand`，不要 Ctrl+V。禁止对 ChatGPT/Gemini 写专用 CSS。
6. 贴进去之后停约 0.8s，让「同一条 prompt、不同站点」被看清。不要点发送（各家发送键位置不稳，也不是本镜要卖的）。

### 5. Settings：代理 + 其它卖点

Application → **Settings**。Dev enhancer 若先停在 Networks，**不要**先切走再切回来——Networks 正好是下一镜。

| 镜 | 做什么 | 为什么 |
|----|--------|--------|
| Networks / Global Proxy | 从上往下连点 Direct → Follow system → Select from proxy servers → Manual。各档之间不要空等；只有 Manual 带出 host/port 时多停一拍，**不要输入真实代理**。然后点回 Direct（或画像里实际能上网的那档），避免后面 AI 页挂掉。 | 全球站 + 按网络策略分流是产品硬能力。 |
| Manage AIs | 侧栏点进去。表上六行全启用，Preload on Startup 全勾。可打开 **Gemini**（或任一）编辑页，指出 per-AI proxy：Follow global / Direct / from list / manual，然后关掉，不保存改代理。 | 预加载和「这一页可以不跟全局代理」必须被看见。 |
| 不要拍 | Appearance 的 Dark、Language 切中文、Wipe、Check catalog 联网、About 长页滚动。 | 浅色英文已经成立；Wipe 毁画像；catalog 检查会空等。 |

**可以各停一拍的加分项（有时间再加，没有就删）：**

- Manage AIs 表格里六家 logo 一览（供应商辨识，见 `ai-vendor-logo-identity`）
- Done / Exit 回 ChatGPT，badge 上名称对得上

结束：光标停在主壳，当前页是一家已登录的 AI。不要关进程给 OBS 看（`--keep-open` 收尾）。

## 不要拍

- Dark / Follow System / 任何主题对比
- GuidingView、Hold to finish
- 浮层 Switch 卡片、菜单里 Next Page（新开实例）
- 远程站点内部按钮（Send、新对话、账号头像）
- 真实代理密码、邮箱、API key
- 演示失败时的 `showErrorBox`、空白加载、地区墙

## 和实现的关系

| 段 | 建议 scene id | 备注 |
|----|----------------|------|
| 0–3 | `switch-ai` | badge → 两家具名切换 → Prev/Next；删掉旧的 Switch AI 菜单/快捷键阅兵 |
| 4 | `prompt` | 侧栏保持打开时切 3 次再 Copy+paste |
| 5 | `settings` | Networks + Manage AIs；**删除**浅色切深色 |
| （备带） | `setup` | 默认 playlist **不包含** |

默认 `yarn demo:playwright` 应是 `switch-ai → prompt → settings`。画像 seed 必须实现本文「预先准备」，不要再只开四家、只 preload ChatGPT。

## 禁止项

- 不要为了「炫」把暗夜模式加回来。
- 不要用 E2E 的 `about:blank` 四页出镜。
- 不要对 ChatGPT/Gemini 等做 `getByRole` / CSS locator。
- 不要 `setAlwaysOnTop`。
- 不要把窗口设成非 16:9，也不要把小于 1080 的采集放大到 1080p。
- 不要在片里 `--reset-profile`。
- 不要让光标在下拉 / 选择列表里从上到下滑过再点；目标行上直接点，点击必须带光点。
- 不要对同一颗按钮「先滑过去停住再点」；不要连点 Next 时把光标挪走再滑回来。
- 不要把 hover / 点击光点 / afterClick / 切页 wait 叠成一段空镜。

## 与现有文档的关系

- 导演 / 光标 / 启动器：[`playwright-demo-record.md`](./playwright-demo-record.md)（本文不取代）
- badge：[`menubar-current-ai-dropdown.md`](./menubar-current-ai-dropdown.md)
- Prompt 不自动注入站点：[`prompt-view.md`](./prompt-view.md)
- 代理与页实例：[`ai-config.md`](../architecture/ai-config.md)
- Manage AIs 表：[`manage-ais-table-ux.md`](./manage-ais-table-ux.md)、[`manage-ais-save-scopes.md`](./manage-ais-save-scopes.md)
