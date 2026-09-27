# Playwright 产品演示脚本

ChatAIO 用 Playwright `_electron.launch` 驱动 unpackaged Electron，走出镜用的操作编排。给 OBS 录屏当「演员」，**不是**回归测试。

## 一句话结论

`projects/ChatAIO/demo/` 是独立导演层：场景可单拍、也可一条 playlist 连成一条 take。录像交给 OBS，Playwright 不写 video。E2E 套件（`e2e/`、`yarn test:e2e`）不跑这些脚本。

## 连续一条 vs 多场景拼接

OBS 后期本来就要切。脚本按**场景模块**写，不要写成不可拆的超长函数。

| 拍法 | 何时用 |
|------|--------|
| **一条 playlist、同一进程连跑**（默认 `yarn demo:playwright`） | 过一遍节奏、或想一条长 take |
| **`--scene <id>` 单场景** | 某一段翻车只重录这一段，OBS 再拼 |

场景边界约 0.5s，方便 OBS 下刀。不要为了「一条过」把 Guiding、切 AI、Prompt、Settings 焊死在同一个函数里。

## 和 E2E 的边界

| | E2E `e2e/` | 演示 `demo/` |
|--|--|--|
| 目的 | 断言契约，要快、要绿 | 人眼好看，节奏跟手 |
| 启动 | `yarn test:e2e` | `yarn demo:playwright` |
| 画像 | 临时目录 + `about:blank` 四页 | 持久 `demo/.profile/` + **真站点 URL** |
| 远程 AI DOM | 禁止点 | 同样不点；站点只当背景 |
| 成功标准 | expect | 跑完且主进程没炸 |
| 录像 | 默认关（Windows ffmpeg 易挂） | 不录；OBS 录 |

演示仍设 `CHATAIO_E2E=1`，只为复用现有闸门：隔离 userData、走 `dist/` renderer、挂探针等壳层就绪。另设 `CHATAIO_DEMO=1`。不要把演示场景放进 `e2e/tests/`，也不要开 `CHATAIO_E2E_WATCH`（高亮/操作标签会进画面）。

可复用 `e2e/support` 里的路径解析、探针等待、下拉重试。演示自己管：持久画像、鼠标移动、停顿、场景目录。不要复用 `watchClick` 当出镜点击。

## 出镜节奏（像人）

成片参考 Screen Studio 的 **Rapid** 光标（更慢的 smoothing 会看起来「点比光标先到」）和 ngram / Clevera 的 **dead-air trim**：空等、加载空镜、重复尝试都要剪掉。本导演层在录的时候就按这个拍，不要指望后期救。

1. **移动时长 ∝ 距离**（约 70ms + 0.28ms/px，封顶 ~340ms）。已经在目标 12px 内直接点。第一次出场从目标旁滑入，禁止从左上角飞过来。
2. **长距离一条很浅的弧 + smoothstep**，短距离走直线。不要每段都固定 480ms。
3. **到了就点。** hover 只留瞄准（~40ms）；列表点名出现在行上再点（~70ms）。`pulse()` 后约 40ms 就 `mouse.down`，光点和按下叠在一起，不要等动画播完再点，也不要点击后再空等 0.5s。
4. **只在结果上停：** 第一次六家列表、新 AI 出画、贴进输入框、Manual / Edit 表单。`waitForCurrentAi` 用 `holdRemaining`：快照已经花掉的时间从 afterSwitch 预算里扣。
5. **同一手势加快。** 第二回打开 badge 列表、连点 Next、代理 radio 连扫，都不要按「第一次介绍」来停。
6. **禁止叠 hold。** 不要 `demoMoveTo(badge)` 再 `demoClick(badge)`；不要 Copy 后再 `afterPageMs` 才去贴；不要每个 radio 后再 `afterPageMs`。

分镜里的具体秒数见 [`playwright-demo-script.md`](./playwright-demo-script.md)。

## 出镜叙事

分镜、六家 AI、窗口档位、禁止暗夜模式：**只维护** [`playwright-demo-script.md`](./playwright-demo-script.md)。本文不重复写故事。

默认 playlist（返回用户、浅色英文）：`switch-ai` → `prompt` → `settings`。`setup` / Guiding 是备带，不进默认 take。登录不写进脚本：人在 `demo/.profile/` 里事先登好六家。

## 不变量

1. 演示代码只活在 `demo/`。`yarn test:e2e` 的 `testMatch` 碰不到它。
2. 禁止对远程 AI 写各家 CSS。贴进输入框用通用可见 composer 探测 + `insertText`；未登录不要点下三分之一登录钮。
3. 禁止默认 Playwright `video`。Windows 上 Electron+ffmpeg 收尾易挂，和 E2E 同一条禁令。
4. 演示画像默认**不删**。`--reset-profile` 才清空。不要写进本机 `%APPDATA%/ChatAIO-dev`。
5. Windows FloatingView 仍禁止 `forward: true`。演示不改鼠标穿透。
6. 改了 `src/Main` 或壳层 renderer 必须先 `yarn build:webpack`。缺 `dist/` 时 runner 会构建（`--skip-build` 则直接失败）。
7. 切 AI 快捷键挂在 AI WCV 的 `before-input-event`（以及 OS `globalShortcut`）上。Playwright `page.keyboard` **打不进去**。出镜用 Switch AI 菜单项（上面有 accelerator），效果相同。
8. **开录必须是浅色，片中也不出现 Dark。** 启动前把 `user-settings.json` appearance 钉成 `light`；`CHATAIO_DEMO=1` 时 `before-launch` 把 `nativeTheme.themeSource` 设为 `light`，Guiding `get-guiding-defaults` 把默认 theme 钉成 `light`（否则 Follow System 赶上 Windows 深色会整页发黑——`getSystemTheme` 读的是系统集成色，**不受** `themeSource` 影响）。禁止 Guiding 选 Dark、禁止返回用户种子带 `theme: dark`、禁止 settings 场景再切 Dark。导演在主题 primed 之后才打印「OBS 可以开始录了」。窗口档位与六家 AI 见出镜脚本。
9. **屏幕上始终只有一颗演示指针，而且轨迹不能断。** 指针是 56px 透明置顶小窗，尖端跟**屏幕坐标**走，从亮出到收尾都不 `hide`、不把 opacity 打到 0。不要画进各页 overlay（MainView 只有 36px 会裁掉；切到 Dropdown 再藏主窗那颗，列表停顿时箭头直接消失）。也不要做整客户区透明罩：Windows **忽略** `alwaysOnTop` 的 level，Dropdown 会把罩子连箭头一起盖住。小窗每帧 `setBounds` + `moveTop`，开下拉后仍压在列表上面。穿透用 `setIgnoreMouseEvents(true)`，**禁止 `{ forward: true }`**。页内 CSS `cursor: none` 仍然要打。OBS **不要** Capture Cursor，并用**显示器 / 区域采集**（只 Window Capture Main 会采不到这颗独立指针窗，也采不到 Dropdown）。
10. **出镜点击必须是 CDP `mouse.down/up`。** 合成 `dispatchEvent(MouseEvent)` 不会切换 antd Radio/Switch、不会聚焦输入框。menubar 只在 button `mousedown` 开下拉，也以真实输入为准。屏幕指针层不可命中。tsx/esbuild 会给页内具名函数插入 `__name`，Playwright `evaluate` 必须先垫 `globalThis.__name`（`demo/support/tsx-evaluate.ts`）。
11. **下拉列表禁止沿条目逐项 hover。** 指针从当前位置**滑到**目标行再点（一条轨迹），CDP 只在终点按下。禁止从上到下扫过中间项。光点由 `pulseDemoCursor` 在 `mouse.down` **之前**打在屏幕指针上（约 40ms）。圆环贴箭头尖，大约 18px。
12. **光标走位要像人。** 时长按距离算，近了就点；连点同一颗按钮不要把光标挪走。切页 / 开面板的 wait 算进 dwell，禁止再叠一段同名空等。

## 入口

仓库根或本目录：

```bash
yarn demo:playwright
yarn demo:playwright -- --list
yarn demo:playwright -- --scene switch-ai
yarn demo:playwright -- --scene=setup --scene=switch-ai --reset-profile
yarn demo:playwright -- --keep-open
```

| 参数 / 环境变量 | 作用 |
|-----------------|------|
| `--scene a,b` / `--scene=a --scene=b` | 只跑这些场景（PowerShell 里逗号会断参数，用第二种） |
| `--reset-profile` | 清空 `demo/.profile/`（`setup` 默认也会清） |
| `--keep-open` | 跑完不退，方便登录或 OBS 收尾 |
| `--skip-build` / `CHATAIO_E2E_SKIP_BUILD=1` | `dist/` 缺失时不要自动构建 |
| `--pace 1.2` / `CHATAIO_DEMO_PACE` | 停顿和鼠标移动倍率 |
| `CHATAIO_E2E_DEBUG=1` | 打 Electron stdout/stderr |

完整命令见 [`scripts.md`](../../scripts.md)。

## 关键文件

| 路径 | 职责 |
|------|------|
| `demo/run.ts` | 导演：解析参数、查 dist、启停 Electron、按 playlist 跑场景 |
| `docs/features/playwright-demo-script.md` | 出镜分镜（拍什么）；默认 playlist 以本文为准 |
| `demo/scenes/*.ts` | 单场景；可单跑可串 |
| `demo/support/launch.ts` | `_electron.launch`；持久 userData；**不**沿用 E2E 的 mkdtemp + about:blank |
| `demo/support/window-size.ts` | 录屏窗三档：1920×1080 / 1600×900 / 1280×720 |
| `demo/support/profile.ts` | 返回用户 seed：六家真站点全开 preload、浅色英文、全局 Direct、last-used=ChatGPT |
| `demo/support/pace.ts` / `mouse.ts` | 停顿预算、距离决定滑行、近目标跳过、CDP 按下；列表点名 `demoClickDirect`（不扫过）；`holdRemaining` 把 wait 算进 dwell |
| `demo/support/cursor.ts` | 56px 置顶指针小窗（屏幕坐标、全程不藏）；滑行在主进程 `setBounds`；`raiseDemoCursorLayer` 压过 Dropdown；藏系统指针 |
| `demo/support/tsx-evaluate.ts` | tsx/esbuild `__name` 垫片；没有它 `page.evaluate` 里的具名函数会直接炸，光标和粘贴都装不上 |
| `demo/support/theme.ts` | preroll 前确认 Light 单选 |
| `src/Main/foundation/e2e-mode.ts` | `isChatAioDemo()`；Guiding 默认浅色、prelaunch `themeSource` |
| `demo/support/shell.ts` | 开菜单 / Settings / Prompt；下拉重试对齐 E2E 探路结论 |
| `demo/.profile/` | 持久 userData（gitignore） |

## 禁止项

- 不要把演示场景写成 `e2e/tests/*.spec.ts`，也不要让 `test:e2e` 间接跑到。
- 不要对远程 ChatGPT/Gemini 写各家 CSS locator。贴进输入框只允许通用可见探测，且必须避开登录字段。
- 不要用合成 `Control+V` 往 AI 页粘贴。tsx 下 `page.evaluate` 里的具名函数会变成 `__name(...)`，必须先垫 shim，再 focus 探测到的 composer（排除登录字段），用 `insertText` / `execCommand`。点进去若变成邮箱/密码或登录墙则 Next 到有 guest 输入框的页。
- 不要用 E2E 的 `about:blank` 四页当出镜画像。
- 不要 `page.screencast.showActions` 出镜（操作标签像调试）。
- 不要 `setAlwaysOnTop` 主窗：Dropdown / FloatingView 是独立 BrowserWindow，会被压到后面。
- 不要在演示路径弹 `showErrorBox` 还指望 Playwright 点掉（E2E 已 stub；演示同走 `CHATAIO_E2E`）。
- 不要让 Guiding / 返回用户种子以深色开场，也不要在片里演示 Dark。不要用 `nativeTheme.themeSource = light` 当唯一手段——Windows 上 Guiding Follow System 仍会解析成系统深色。
- 不要在每个 BrowserWindow / WCV 各留一颗可见光标，也不要把指针画成整客户区透明罩（Windows 上下拉会盖住）。必须是始终可见的置顶小窗，`setIgnoreMouseEvents(true)` **且不要 `forward: true`**。禁止把箭头画进 MainView（会被 36px menubar 裁掉）。开着下拉时也不许把指针藏起来。
- 不要让 OBS Capture Cursor 和演示指针同时出镜。不要只用 Window Capture 采 Main 还指望独立指针窗进画面。
- 不要用合成 `dispatchEvent(MouseEvent)` 当出镜点击。必须 CDP `mouse.down/up`。
- 不要在下拉选择列表里把光标沿条目扫过 hover；从当前位置滑到目标行再点。点击光点打在屏幕指针上。
- 不要固定时长滑行、不要从客户区左上角出场、不要对同一目标先 `demoMoveTo` 再点。不要把 afterClick / afterSwitch / afterPage 叠成空镜。

## 与现有文档的关系

- E2E 不变量、WCV 发现、下拉重试：[`e2e-playwright.md`](./e2e-playwright.md)。本文不取代它。
- 切 AI / 浮层：[`floating-view-rapid-switch-optimization.md`](./floating-view-rapid-switch-optimization.md)、[`menubar-current-ai-dropdown.md`](./menubar-current-ai-dropdown.md)
- Guiding / Settings / Prompt 产品行为仍以各自文档为准；演示只编排手势。
