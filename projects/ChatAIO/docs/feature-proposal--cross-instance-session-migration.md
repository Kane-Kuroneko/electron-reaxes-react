# 跨实例 AI 登录会话迁移 — 愿景与可行性文档

> 状态：调研完成，待实现
> 创建日期：2026-06-16
> 关联文档：`docs/architecture/ai-config.md`、`.claude/rules/ipc-coding.md`

---

## 1. 背景与动机

### 1.1 用户痛点

ChatAIO 作为多 AI 服务的 Electron 容器，每个 AI 服务都需要用户登录才能使用。当用户：

- 在新机器上安装 ChatAIO
- 重装系统后重新部署
- 在开发环境与生产环境之间切换
- 在多台设备之间同步工作环境

……都需要对 **全部已配置的 AI 服务逐一重新登录**。每个服务可能需要手机验证码、邮箱验证、OAuth 授权等不同流程，10 个服务就意味着 10 次独立的认证操作，体验极其繁琐。

### 1.2 核心问题

能否将一台 ChatAIO 实例中已登录的 AI 数据打包，搬运到另一台 ChatAIO 实例上直接还原，从而**避免重复登录验证**？

### 1.3 价值评估

| 维度 | 评估 |
|------|------|
| **用户价值** | 极高 — 从 10 次登录操作减少到 1 次导入操作 |
| **技术可行性** | 中等 — 核心机制可行，但各家服务风控差异大 |
| **实现复杂度** | 中等 — Cookie 迁移约 3-5 天，全功能约 6-11 天 |
| **长期可持续性** | 有限 — DBSC 等新技术将逐步使此功能失效（2026-2028） |

---

## 2. 技术背景

### 2.1 ChatAIO 当前的会话架构

每个 AI 服务运行在独立的 `WebContentsView` 中，使用独立的持久化 Electron 会话分区：

```
partition = "persist:chataio-ai-<sanitized-ai-id>"
```

数据存储在 `<userData>/Partitions/chataio-ai-<id>/`：

```
%APPDATA%/ChatAIO[-dev]/
├── user-settings.json           # 应用设置
├── user-ais.json                # AI 配置（双层系统）
├── Partitions/
│   ├── chataio-ai-default_chatgpt_001/
│   │   ├── Cookies              # SQLite，含 HttpOnly cookie
│   │   ├── Local Storage/       # LevelDB
│   │   └── IndexedDB/           # LevelDB
│   ├── chataio-ai-default_claude_001/
│   │   └── ...
│   └── ...
├── Cookies                       # 默认会话（Settings/Prompt 等）
└── Local Storage/
```

**关键事实**：
- ChatAIO 不实现任何自定义认证——完全依赖 AI 网站自身的 cookie 认证
- AI 视图使用 `ai-page-preload.ts` 预加载脚本（仅覆盖 `navigator.language` 和主题，不做其他注入）
- 已有 `clearSessionPartitions()` 和 `getPersistedAIPartitionsFromUserData()` 等会话管理基础设施

### 2.2 Electron 对 Cookie 的完全控制权

这是本功能的技术基石：

| 浏览器 (无权限) | Electron (完全权限) |
|---|---|
| `document.cookie` → ❌ HttpOnly Cookie | `session.cookies.get()` → ✅ 全部 Cookie |
| JS 受 V8 sandbox 限制 | 绕过 sandbox，直接操作 Chromium C++ Cookie Store |
| 同源策略限制 | `session.cookies` API 在主进程 Node.js 环境运行，无视同源 |

**`HttpOnly` 只是 DOM 层面的标志**——在 Chromium 底层的 Cookie 存储（SQLite）中不区分 HttpOnly。Electron 的 `session.cookies` API 封装的是 `net::CookieStore` 原生接口，对所有 cookie 有完全读写权限。

### 2.3 为什么不能直接复制分区文件

| 障碍 | 原因 |
|------|------|
| **Cookie 加密 (DPAPI/Keychain)** | Chromium 使用 OS 级加密存储 cookie。Windows 的 DPAPI 使用机器特定密钥——在另一台机器上无法解密 |
| **LevelDB 字节序** | localStorage/IndexedDB 的 LevelDB 格式在跨平台（Windows <-> macOS <-> Linux）时可能不兼容 |
| **分区目录名依赖 AI ID** | 目录名派生自 `AIItem.id`，不同实例的 AI ID 可能不同 |

因此，不能简单地复制 `Partitions/` 目录。必须采用编程化导出/导入方案。

---

## 3. 技术方案

### 3.1 总体架构

```
Export Flow:
  Settings/Menu → "导出 AI 登录数据"
  → 对每个 AI 服务：
     - session.fromPartition(partition).cookies.get({})
     - webContents.executeJavaScript 读取 localStorage（可选）
  → 序列化为 JSON → AES 加密 → .chatailogin 文件
  → 保存到用户指定位置

Import Flow:
  Settings/Menu → "导入 AI 登录数据"
  → 选择 .chatailogin 文件 → AES 解密
  → 展示 AI 列表（含源→目标 ID 映射 UI）
  → 对每个 AI：
     - 确保 session partition 存在
     - session.cookies.set({...}) 写入 cookie
     - 可选：executeJavaScript 写入 localStorage
  → 重新加载 AI 视图使新 cookie 生效
  → 显示摘要报告
```

### 3.2 核心技术组件

#### 3.2.1 Cookie 导出/导入服务

```typescript
// 导出
const exportAISessionCookies = async (aiId: string): Promise<Electron.Cookie[]> => {
    const partition = `persist:chataio-ai-${aiId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const ses = session.fromPartition(partition);
    return await ses.cookies.get({});
};

// 导入
const importAISessionCookies = async (aiId: string, cookies: Electron.Cookie[]): Promise<void> => {
    const partition = `persist:chataio-ai-${aiId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const ses = session.fromPartition(partition);
    for (const c of cookies) {
        await ses.cookies.set({
            url: `${c.secure ? 'https' : 'http'}://${c.domain}${c.path}`,
            name: c.name, value: c.value,
            domain: c.domain, path: c.path,
            secure: c.secure, httpOnly: c.httpOnly,
            sameSite: c.sameSite, expirationDate: c.expirationDate,
        });
    }
};
```

**注意**：`session.cookies.set()` 需要正确的 `url` 参数，Chromium 会验证 domain 匹配和 Secure cookie 只能通过 HTTPS 设置。由于所有目标 AI 服务都使用 HTTPS，这不是问题。

#### 3.2.2 localStorage 导出/导入（可选增强）

localStorage 的访问需要 webContents 加载到正确的域名。通过预加载脚本或 `executeJavaScript`：

```typescript
// 导出——需要 webContents 已加载到正确的 origin
const storage = await view.webContents.executeJavaScript(`
    JSON.stringify(localStorage)
`);

// 导入——在页面加载前通过 preload 注入
// 或在页面加载后通过 executeJavaScript 写入
await view.webContents.executeJavaScript(`
    const data = ${JSON.stringify(storageData)};
    Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
`);
```

**局限**：只能访问当前 origin 的数据。部分 AI 页面可能有多个子域名（如 `accounts.x.ai` vs `grok.com`），需要分别处理。

#### 3.2.3 数据加密与打包

```
打包格式 (.chatailogin):
{
    version: 1,
    created_at: "2026-06-16T...",
    source: {
        app_version: "x.y.z",
        platform: "win32",
        electron_version: "41.0.3",
    },
    ais: [
        {
            ai_id: "default-chatgpt-001",
            ai_family: "chatgpt",
            url: "https://chatgpt.com",
            cookies: [...],
            localStorage: { key: "value", ... },  // 可选
        },
        ...
    ],
}
```

加密方案：
- 使用 `crypto.createCipheriv('aes-256-gcm', key, iv)`
- 密钥由用户提供的密码通过 `crypto.pbkdf2Sync` 派生
- 导出文件扩展名 `.chatailogin`

#### 3.2.4 AI ID 映射

源实例和目标实例的 AI ID 可能不同。导入时需要 UI 映射：

```
源实例                         目标实例
┌─────────────────────┐       ┌─────────────────────┐
│ default-chatgpt-001 │  →   │ default-chatgpt-001  │  ← 自动匹配（相同 ID）
│ my-custom-claude    │  →   │ default-claude-001   │  ← 用户手动映射
│ default-gemini-001  │  →   │ [跳过]               │  ← 用户选择不导入
└─────────────────────┘       └─────────────────────┘
```

匹配逻辑：优先按 `AI_family` 自动匹配（一个目标实例通常只有一个同 family 的 AI）。

#### 3.2.5 新 IPC 通道

需在 `IpcSchema.d.ts` 中定义新通道：

```typescript
// IpcRpc 新增
'export-ai-sessions': IpcStructure.IpcRpc<[{ password: string }], { filePath: string }>;
'import-ai-sessions': IpcStructure.IpcRpc<[{ filePath: string, password: string, mapping: Record<string, string> }], ImportResult>;
'preview-ai-sessions-export': IpcStructure.IpcRpc<[{ filePath: string, password: string }], ExportPreview>;
```

#### 3.2.6 SettingsView UI

- **导出页卡**：显示所有已配置 AI 列表，标注哪些有可导出数据（cookie 数量），设置密码
- **导入页卡**：选择 .chatailogin 文件 → 输入密码 → 预览内容 → 映射 AI ID → 确认导入
- **进度和摘要**：导入进度条，完成后显示 "3/4 AI 登录状态已还原"

### 3.3 工作估算

| 组件 | 工作量 | 复杂度 |
|------|--------|--------|
| Cookie 导出/导入核心服务 | 2-3 天 | 低 |
| 文件加密/打包 | 0.5 天 | 低 |
| IPC 通道注册 | 0.5 天 | 低（遵循现有模式） |
| SettingsView 导出 UI | 1-2 天 | 中 |
| SettingsView 导入 UI + ID 映射 | 1-2 天 | 中 |
| 错误处理 & 边界情况 | 1 天 | 中 |
| localStorage 传输（可选增强） | 1-2 天 | 中 |
| **总计** | **6-11 天** | |

---

## 4. 调研：各家 AI 服务风控与迁移可行性

### 4.1 总览

| 服务 | 核心凭证 | 存储 | 设备指纹 | 风控强度 | 迁移可行性 |
|------|---------|------|---------|---------|-----------|
| **DeepSeek** | `userToken` JWT | **localStorage** + Cookie | 低 (PoW) | 🟢 低 | 🟢 **极易** |
| **Perplexity** | `__Secure-next-auth.session-token` | Cookie (HttpOnly) | 低 | 🟢 低 | 🟢 **容易** |
| **Grok (xAI)** | `sso` + `sso-rw` cookies | Cookie (HttpOnly) | 中 (Cloudflare) | 🟡 中 | 🟡 **可能触发验证** |
| **ChatGPT (OpenAI)** | `__Secure-next-auth.session-token` | Cookie (HttpOnly) | 中 (Cloudflare Turnstile) | 🟡 中-强 | 🟡 **可能触发 2FA** |
| **Claude (Anthropic)** | `sessionKey` / `sessionKeyV2` | Cookie (HttpOnly) | 高 (`anthropic-device-id` 10 月) | 🟡 中-强 | 🟡 **1h 轮换风险** |
| **Gemini (Google)** | `__Secure-1PSIDCC` 等 | Cookie (HttpOnly) | **极高** (Google 账户体系) | 🔴 **最强** | 🔴 **高概率触发 2FA** |
| **豆包 (ByteDance)** | X-Auth-Token + `c10` + msToken | Cookie + localStorage + WebSocket | **极高** (`c10` 设备指纹不可复用) | 🔴 **极强** | 🔴 **几乎不可能** |
| **Kimi (Moonshot)** | OAuth (Web: HttpOnly Cookie) | Cookie (HttpOnly) | 中 (Device ID header) | 🟡 中 | 🟡 **可能异常** |
| **通义千问 (Alibaba)** | 阿里云账号体系 | Cookie (推测) | 中-高 | 🟡 中-强 | 🟡 **视阿里云检测** |

### 4.2 逐家深度分析

#### 🟢 DeepSeek — 最容易迁移

主认证凭证是 `localStorage` 中键名为 `userToken` 的 JWT (HS512)。没有 Cloudflare 防护，没有设备指纹 Cookie。唯一的反滥用机制是 PoW（WebAssembly SHA3 挑战），但这是无状态的——每次请求客户端独立解决。

**迁移策略**：导出 localStorage `userToken` + cookie 即可。成功率接近 100%。

#### 🟢 Perplexity — 较容易迁移

使用 NextAuth.js，核心 Cookie `__Secure-next-auth.session-token`。无激进设备指纹或 IP 绑定。

**迁移策略**：导出 cookie 即可。成功率 > 90%。

#### 🟡 ChatGPT (OpenAI) — 中等难度

核心 Cookie `__Secure-next-auth.session-token`。使用 **Cloudflare Turnstile** 人机验证和 **PoW Token**（`Openai-Sentinel-Proof-Token`）。Cloudflare 对每个请求计算 Bot Score (1-99)。新设备会导致 Bot Score 下降。`cf_clearance` Cookie 是浏览器特定的，不能简单复制。

**但**：社区报告表明，一旦登录建立，IP 变化不会可靠地使会话失效。Token 可存活 ~30 天。

**迁移策略**：导出所有相关 cookie。首次请求可能触发 Turnstile 挑战。如果源实例和目标实例使用相同代理 IP，成功率大幅提升。

#### 🟡 Claude (Anthropic) — 中等难度，关注设备 ID

有**显式的设备身份 Cookie**：`anthropic-device-id`（10 个月有效期）。这意味着 Anthropic 可以检测到同一 session 在不同设备上出现。`sessionKeyV2` 有效期仅 **1 小时**，说明有自动轮换机制。如果轮换依赖设备 ID，迁移后 1 小时内可能失效。

**但**：Web 版（ChatAIO 使用的）使用 Clerk OAuth，不是 Claude Code CLI 的 40+维度遥测。Web 版检测相对宽松。

**迁移策略**：导出所有 cookie 包括 `anthropic-device-id`。注意 1 小时轮换窗口。使用同一代理 IP 有帮助。

#### 🔴 Gemini (Google) — 高难度

Google 拥有最成熟的登录风险检测系统：
- **设备指纹**：浏览器型号、OS 版本、屏幕分辨率、WebGL 指纹、音频上下文
- **Impossible Travel 检测**：短时间内地理跳跃直接标记
- **新设备强制验证**：在新设备上登录**必须**通过手机确认 / SMS / TOTP 二次验证——不可跳过
- **DBSC (Device Bound Session Credentials)**：2025 年 7 月推出公测版，将 session 加密绑定到设备 TPM

**迁移策略**：Cookie 迁移后几乎必定触发至少一次验证。如果用户有 2FA 开启，需要走设备信任流程。但迁移的 cookie 配合 2FA 验证后通常可以继续使用。

#### 🔴 豆包 (Doubao) — 几乎不可能

字节跳动的多层风控体系：

```
认证层:
├── Cookie: c10 (设备指纹ID) + session
├── Header: X-Auth-Token (2h 过期), X-Device-ID, X-Session-ID
├── WebSocket: 长连接维持会话
├── 签名: a_bogus 动态签名 (window.byted_acrawler.frontierSign())
├── c10: 设备指纹 ID —— 文档明确说明"不可复用旧值，新设备首次访问必生成"
├── msToken: 动态刷新
└── 风控: w-iForest 无监督异常检测算法
```

`c10` 基于 Canvas/WebGL/UA/屏幕/字体等数十维特征，与浏览器环境强绑定。迁移后 `c10` 与新环境指纹不匹配会导致服务端拒绝。还有多端登录限制——活跃设备数超限自动作废旧会话。

**迁移策略**：无有效策略。必须走完整重新登录流程（短信 / 抖音授权 / Apple ID）。

### 4.3 全局风险因素

| 风险因素 | 影响的服务 | 缓解办法 |
|----------|-----------|---------|
| **IP/地理位置变更** | 全部，尤其 Google | 使用同一代理 IP |
| **Chromium 版本差异** | ChatGPT, Claude, Google | 保持 ChatAIO 版本一致 |
| **屏幕分辨率差异** | 豆包, Google | 不可控——设备指纹固有特征 |
| **TLS 指纹 (JA3/JA4) 差异** | Grok, 豆包, ChatGPT | 不可控——不同 OS 协商参数不同 |
| **Token 轮换冲突** | Claude (1h), DeepSeek (1h) | 源实例暂停使用，或接受短暂失效 |
| **DBSC 未来影响** | 全部 (行业趋势) | 2026-2028 年逐步失效 |
| **同账号多端在线** | 豆包, Google | 可能触发安全策略 |

---

## 5. 风险与限制

### 5.1 技术风险

1. **Cookie 轮换导致导入快速失效**：Claude 的 `sessionKeyV2` 每小时轮换。如果轮换依赖设备 ID，导入的 cookie 可能在 1 小时内过期。

2. **Cloudflare Bot Score 重置**：新设备/新浏览器的 Bot Score 从零开始，可能触发 Turnstile 挑战。需要用户手动完成验证。

3. **localStorage 跨域问题**：部分服务使用多个子域名存储数据（登录域 vs 应用域）。单次 `executeJavaScript` 只能访问当前 origin。

4. **IndexedDB / Service Worker 不可迁移**：没有通用 API 可以批量导出 IndexedDB。不过调研表明这 9 家服务都不将主认证数据放在 IndexedDB 中。

### 5.2 安全风险

1. **导出文件即不记名令牌**：`.chatailogin` 文件包含所有 AI 服务的登录凭证。任何人获得此文件和密码即可完全控制这些 AI 账户。

2. **加密实现安全**：AES-256-GCM 的实现必须正确使用 IV、认证标签和 PBKDF2 迭代次数。建议使用经过审计的现成方案。

3. **导入后的残留风险**：如果用户在导入后没有安全删除导出文件，文件可能被恢复。

### 5.3 用户体验风险

1. **部分成功**：10 个 AI 服务中，可能 3 个成功、4 个需要重新验证、2 个失败、1 个不支持。需要清晰的摘要报告。

2. **伪装的安全性**：用户可能误以为导入功能可以绕过所有验证，当部分服务要求重新登录时感到失望。

3. **误导用户预期**：需要在 UI 中明确展示各服务的预计成功率。

### 5.4 长期可持续性风险

1. **DBSC (Device Bound Session Credentials)**：Google 领导的 W3C 标准，将 session cookie 加密绑定到设备 TPM/安全芯片。Chrome 已进入公测阶段。一旦 AI 服务部署 DBSC，跨设备 cookie 迁移将**彻底失效**。这是**这个功能的终点**。

2. **Cloudflare 信号持续丰富**：Cloudflare 的 Bot Score 模型持续获取更多信号（TLS JA4、HTTP/2 fingerprint、QUIC 参数），使新设备更难通过。

---

## 6. 实现路线图建议

### Phase 1：核心 Cookie 迁移（MVP）

- Cookie 导出/导入服务
- AES-256-GCM 加密打包
- 基本的导出/导入 UI（含 AI ID 映射）
- 摘要报告
- **目标**：支撑 DeepSeek, Perplexity, Grok, ChatGPT 四个服务的基本迁移

### Phase 2：localStorage 增强

- localStorage 的读取/写入（通过 preload 注入）
- 多域名支持
- **目标**：覆盖 DeepSeek 等使用 localStorage 存 token 的服务

### Phase 3：预检与适配

- 导出前对各 AI 服务的迁移可行性进行预检
- 针对不同 AI 服务的特殊处理逻辑（如 Cloudflare clearance 的保留）
- 迁移成功率预估

### Phase 4：高级功能

- 增量同步（只迁移新增/变更的 AI）
- 定时自动备份
- 跨设备同步（通过自建同步服务或文件同步工具配合）

---

## 7. 开放问题（待决定）

1. **是否开源导出格式**：`.chatailogin` 格式是否公开文档化？公开可能带来安全风险（第三方工具可以解析），但也方便社区贡献。

2. **密码策略**：导出加密是可选还是强制？建议**强制**——明文存储所有 AI 登录凭证的风险不可接受。

3. **AI 间依赖处理**：Google 账户同时用于 Gemini 和其他 Google 服务——导出 Gemini 的 cookie 可能意外包含了 Google 账户的其他敏感 cookie。如何处理 cookie 的域过滤？

4. **验证流程**：导入后是否需要用户"验证"（打开每个 AI 页面确认登录状态）？还是自动检测？

5. **导入后的清理**：导入完成后是否主动清除源 cookie 中的 session 信息（防止用户误以为可以同时在两台设备上使用）？

---

## 8. 参考资料

### 项目内参考

| 文件 | 内容 |
|------|------|
| `src/Main/reaxels/Views/AI-Views/index.ts` | 分区定义、会话清理逻辑 |
| `src/Main/reaxels/Views/utils/initWebContentsView.ts` | WebContentsView 工厂 |
| `src/Main/services/settings/ai-config-service.ts` | AI 配置双层系统 |
| `src/ai-page-preload.ts` | AI 页面预加载脚本 |
| `src/Types/IpcSchema.d.ts` | IPC 类型定义 |
| `src/Types/SettingsTypes/AI.d.ts` | AIItem 类型 |
| `docs/architecture/ai-config.md` | AI 配置架构 |

### 外部参考

| 主题 | 参考 |
|------|------|
| OpenAI 可疑活动检测 | [OpenAI Help - Suspicious Activity Alert](https://help.openai.com/en/articles/10471992) |
| Anthropic Cookie 策略 | [Claude Privacy - Cookies](https://privacy.claude.com/en/articles/10023541) |
| xAI Cookie 策略 | [xAI Legal - Cookie Policy](https://x.ai/legal/cookie-policy/previous-2025-07-08) |
| DeepSeek Cookie 策略 | [DeepSeek Cookies Policy](https://cdn.deepseek.com/policies/en-US/cookies-policy.html) |
| DeepSeek 认证逆向 | [DeepWiki - deepseek-free-api Auth](https://deepwiki.com/LLM-Red-Team/deepseek-free-api/5-authentication-and-security) |
| 豆包逆向 API | [GitHub - doubao-2api](https://github.com/lza6/doubao-2api) |
| Kimi OAuth 认证 | [DeepWiki - kimi-cli OAuth](https://deepwiki.com/MoonshotAI/kimi-cli/9.7-oauth-and-authentication) |
| Google DBSC 公开测试版 | [The Hacker News - DBSC Open Beta](https://thehackernews.com/2025/07/google-launches-dbsc-open-beta-in.html) |
| W3C DBSC 规范 | [W3C WebAppSec DBSC](https://github.com/w3c/webappsec-dbsc) |
| OWASP Cookie Theft 缓解 | [OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cookie_Theft_Mitigation_Cheat_Sheet.html) |
| 现代 Web 会话安全 | [Session Security in 2025](https://www.techosquare.com/blog/session-security-in-2025-what-works-for-cookies-tokens-and-rotation) |
