# Sensitive Region Access Blocking

## 结论

该功能有必要实现，但它的本质不是普通 UI 开关，而是 AI 页面加载前的出口网络风险控制。正确的判断对象不是用户本机所在地区，也不是系统语言或时区，而是当前 AI page 在应用内实际使用的 Electron session/proxy 链路对应的公网出口 IP 地区。

MVP 方案：

- 在每个 `AI.AIItem` 上增加一个布尔开关 `blockSensitiveRegionAccess`。
- 开关启用后，AI page 加载远程 AI URL 前，先用同一个 `session` 访问公网 IP 地区探测服务。
- 探测结果命中敏感国家/地区码，或探测失败无法确认地区时，不加载远程 AI 页面，改为加载本地阻断提示页。
- 首版敏感地区名单先内置在 main 进程服务中，默认包含常见受欧美 AI 服务限制的国家码，后续再演进为可配置列表或按 provider 独立列表。

## 背景依据

主流 AI Web 产品的地区支持不是静态事实，会持续变化，不能把某个第三方博客的列表固化为长期事实。实现上应只把“当前出口 IP 命中用户明确选择保护的敏感地区时阻断”作为安全保护，不应宣称能替用户完成服务条款或合规判断。

已查阅的官方资料：

- OpenAI Help Center 的 ChatGPT supported countries 页面说明：ChatGPT 仅支持列出的国家和地区，从列表外访问或提供访问可能导致账号被 blocked 或 suspended。
  - https://help.openai.com/en/articles/7947663-chatgpt-supported-countries
- Anthropic supported countries & regions 页面列出 Claude.ai 和商业 API 可用区域，并保留不向特定所有权实体提供服务的权利。
  - https://www.anthropic.com/supported-countries
- Google Gemini web app 支持页面显示 Gemini Web 覆盖范围更广，并且标注 Mainland China 为 Workspace only，说明不同 provider 的地区策略并不一致。
  - https://support.google.com/gemini/answer/13575153?hl=en
- MaxMind 文档说明 GeoLite/GeoIP 支持 country-level 地理定位，但 IP geolocation inherently imprecise；其准确性、更新频率、VPN/移动网络等因素都会影响结果。
  - https://dev.maxmind.com/geoip/geolite2-free-geolocation-data/
  - https://dev.maxmind.com/geoip/docs/web-services/
  - https://support.maxmind.com/knowledge-base/articles/maxmind-geolocation-accuracy

## 用户需求必要性

目标用户并不是所有人，而是以下场景：

- 用户在不同网络环境切换，例如直连、公司网络、机场/代理、移动热点、远程桌面。
- 某些 AI 服务会基于访问来源地区、账号地区、支付地区或异常代理信号限制访问。
- 用户已经在 AI-WebApp 中为不同 AI page 配置不同 proxy，希望某些页面只在“出口 IP 看起来安全”时加载。
- 用户担心误用敏感地区 IP 打开官方 AI 页面导致验证码、风控、账号暂停或登录态异常。

因此该功能应为每个 AI page 独立开关，而不是全局强制开关。不同页面可能使用不同 provider、不同账号、不同代理，也可能故意用于本地/国内 AI 服务。

## 非目标

MVP 不解决以下问题：

- 不绕过任何 AI provider 的服务条款或访问限制。
- 不保证 IP 地理定位 100% 正确。
- 不做每个 HTTP request 的持续防火墙，只在 AI page 加载/重新加载链路上做前置判定。
- 不根据账号归属、手机号、支付地区、浏览器指纹等 provider 风控因素做判断。
- 不在首版提供用户自定义国家列表 UI。

## 产品定义

### 设置项

位置：`Settings > Manage AIs > Add/Edit AI Page`

字段：

- `blockSensitiveRegionAccess: boolean`

UI 文案：

- Label: `Sensitive Region Protection`
- Checkbox: `Block access when the outbound IP is in a sensitive region`
- Tooltip: `Before loading this AI, verify the outbound IP country through the same proxy/session. If it is sensitive or cannot be verified, show a local block notice instead.`

### 行为规则

启用开关时：

1. 创建 AI WebContentsView。
2. 应用该 AI 的 session partition、proxy、Accept-Language、appearance。
3. 用该 view 的 `webContents.session.fetch()` 探测公网出口 IP 国家码。
4. 若国家码在敏感列表内，加载本地阻断页，不访问远程 AI URL。
5. 若所有探测 provider 均失败，为避免保护失效，加载本地阻断页。
6. 若国家码不在敏感列表内，正常加载远程 AI URL。

关闭开关时：

- 不做地区探测，维持现有加载逻辑。

设置变更后：

- 已存在 AI view 必须随 `syncAIViewsWithConfig()` 更新。
- 开关从 false 改 true 时，应立即重新判定并可能切到本地阻断页。
- 开关从 true 改 false 时，如果当前是阻断页，应重新加载真实 AI URL。
- proxy/url 变化时应重新判定。

## 失败策略

MVP 采用 fail-closed：启用保护后，如果无法确认出口 IP 地区，阻断远程 AI 加载。

理由：

- 用户主动启用该功能的核心目的通常是避免把敏感地区出口暴露给 provider。
- fail-open 会在探测服务不可用、DNS 异常、代理不通时直接访问远程 AI，和保护目标冲突。
- 阻断页可清楚展示“无法确认地区”而不是伪装成敏感地区命中。

代价：

- 探测服务被墙、被代理屏蔽或临时故障时，用户会看到阻断页。
- 后续可以增加全局高级选项，让用户选择 `fail-closed` 或 `allow-on-probe-error`。

## 技术架构

### 数据模型

扩展 `AI.AIItem` 和 `AI.EditAIItem`：

```typescript
blockSensitiveRegionAccess: boolean;
```

默认值：

- 内置默认 AI：`false`
- 新增 AI：`false`
- 旧配置 normalize：缺省视为 `false`

### 主进程服务

新增服务：

```text
projects/AI-WebApp/src/Main/services/sensitive-region-access/index.ts
```

职责：

- 定义默认敏感国家码。
- 通过当前 AI view 的 Electron `Session` 探测公网 IP 国家码。
- 解析多个公网 IP/geolocation provider 返回值。
- 生成本地阻断页 `data:text/html` URL。
- 返回可用于 runtime view 比较的 `policyKey`。

首版 provider 顺序：

1. `https://www.cloudflare.com/cdn-cgi/trace`
2. `https://ipapi.co/json/`
3. `https://ipwho.is/`

说明：

- 这些 provider 不需要新增 npm 依赖。
- 探测通过当前 `Session` 发出，因此会走该 AI page 实际 proxy。
- 不向 provider 发送 AI URL、prompt、cookie 或账号数据。

### Runtime view 集成

改动点：

- `src/Main/reaxels/Views/AI-Views/index.ts`
  - 在 AI view 创建和 update 路径中调用敏感地区判定。
  - 记录 `loadTargetURL` 和 `sensitiveRegionAccessKey`，用于判断是否需要 reload。
  - 暴露 guarded reload 方法，供 menu 的 Reload/Force Reload 使用。
- `src/Main/reaxels/Views/utils/initWebContentsView.ts`
  - 支持 AI view 跳过初始自动加载，由 AI-Views runtime 统一控制加载策略。
- `src/Main/reaxels/Menu/index.ts`
  - AI 页面 reload/force reload 走 guarded reload，避免菜单绕过保护。

### UX

阻断页为本地 HTML，不加载远程资源。它必须展示：

- AI page label。
- 目标 URL。
- 探测到的国家码和公网 IP。
- 阻断原因：命中敏感地区，或无法确认地区。
- 当前保护是由 per-AI setting 开启的。
- 改代理或关闭该 AI 的保护开关后可重新加载。

## 风险与边界

- IP geolocation 有误差，尤其是移动网络、企业 VPN、隐私网络和代理出口。
-  provider 地区政策会变，硬编码敏感名单只能作为保护默认值。
- 某些 provider 按账号、付款、手机号、设备指纹、历史行为或代理质量做风控，本功能只处理出口 IP country。
- 如果远程页面已经加载，网络环境在运行中变化，MVP 不拦截每个子请求。重新加载、切换 AI、修改设置会重新判定。
- geolocation provider 本身可能被网络环境屏蔽；MVP 选择 fail-closed。

## 后续演进

- 增加全局“敏感地区列表”高级设置。
- 按 AI family 提供 provider-specific 默认列表。
- 增加地区探测 provider 设置和企业自建 endpoint。
- 增加探测缓存可视化和手动重新检测。
- 增加“只警告不阻断”模式。
- 支持更细粒度地区，例如 Crimea/Donetsk 等 provider 明确列出的受限行政区；MVP 只按 ISO country code 判断。
