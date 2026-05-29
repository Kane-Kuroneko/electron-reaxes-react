# I18n 功能实现说明

## 概述
为 AI-WebApp 实现了完整的国际化(i18n)功能，支持 5 种语言：英语(en-US)、简体中文(zh-CN)、繁体中文(zh-TW)、日语(ja-JP)、韩语(ko-KR)。

## 实现架构

### 1. Renderer 进程 (SettingsView)

#### 文件结构
```
src/Views/SettingsView/
├── ENV/
│   ├── index.ts                    # 环境检测 (isElectron)
│   └── electron/index.ts           # IPC 导出
├── reaxels/
│   ├── i18n/
│   │   ├── index.ts                # i18n reaxel 模块
│   │   └── langs/
│   │       ├── zh-CN.ts            # 简体中文翻译
│   │       ├── zh-TW.ts            # 繁体中文翻译
│   │       ├── ja-JP.ts            # 日语翻译
│   │       └── ko-KR.ts            # 韩语翻译
│   └── exports.ts                  # 导出 i18n 和 I18n 组件
```

#### 关键实现
- 使用 `Refaxel_I18n` 创建 i18n 实例
- 使用 `rehance_I18n_Persist` 实现语言设置持久化
- 通过 webpack ProvidePlugin 全局注入 `i18n` 和 `I18n`

### 2. Main 进程

#### 文件结构
```
src/Main/
├── reaxels/
│   ├── I18n/
│   │   └── index.ts                # 主进程 i18n 模块
│   └── Menu/
│       └── index.ts                # 更新为使用 i18n
└── services/
    ├── ipc/
    │   └── index.ts                # IPC 工具
    └── tray/
        └── index.ts                # 更新为使用 i18n
```

#### 关键实现
- 创建独立的 `reaxel_I18n` 模块供主进程使用
- 通过 IPC 监听渲染进程的语言变更事件
- Menu 和 Tray 动态使用 i18n 翻译

### 3. IPC 通信

#### IpcSchema 定义 (`src/Types/IpcSchema.d.ts`)
```typescript
'language-change' : IpcStructure.RendererToMainEvent<[language: string] , {channel:void,args:void[]}>;
```

#### Preload (`src/preload.ts`)
- 添加 `languageChange` API
- 通过 `useRtm('language-change')` 创建

#### 主进程监听 (`src/Main/when-ready.ts`)
```typescript
useIpcRendererToMain('language-change').on((e, language) => {
  i18n().setLanguage(language as any);
  menu().rebuildMenu();
  if( isTrayActive() ) {
    updateTrayMenu();
  }
});
```

### 4. UI 集成

#### Appearance 组件 (`src/Views/SettingsView/components/Appearance/index.tsx`)
- 语言选择器触发 `handleLanguageChange`
- 同时更新：
  1. SettingsView 状态
  2. 渲染进程 i18n
  3. 通过 IPC 通知主进程

## 翻译覆盖范围

### Menu (Application)
- Application → 应用程序/應用程式/アプリケーション/애플리케이션
- Settings → 设置/設定/設定/설정
- Check for Updates → 检查更新/檢查更新/更新を確認/업데이트 확인

### Menu (View)
- View → 视图/檢視/表示/보기
- Reload → 重新加载/重新載入/再読み込み/새로고침
- Force Reload → 强制重新加载/強制重新載入/強制再読み込み/강제 새로고침
- Developer Tools → 开发者工具/開發者工具/開発者ツール/개발자 도구
- Wipe and Reload This Page → 清除并重新加载此页面/清除並重新載入此頁面/このページを消去して再読み込み/이 페이지를 지우고 새로고침
- Zoom In → 放大/放大/拡大/확대

### Menu (Switch AI)
- Switch AI → 切换 AI/切換 AI/AI を切り替え/AI 전환
- No enabled AI pages → 没有启用的 AI 頁面/沒有啟用的 AI 頁面/有効な AI ページがありません/활성화된 AI 페이지가 없습니다

### Tray
- Show Window → 显示窗口/顯示視窗/ウィンドウを表示/창 표시
- Quit → 退出/結束/終了/종료

### Settings View
- Networks → 网络/網路/ネットワーク/네트워크
- Appearance(feat delayed) → 外观（功能延迟）/外觀（功能延遲）/外観（機能遅延）/모양(기능 지연)
- Manage AIs → 管理 AI/管理 AI/AI の管理/AI 관리
- System → 系统/系統/システム/시스템

### Buttons
- Exit Without Sumbit → 不保存退出/不儲存離開/保存せずに終了/저장 없이 종료
- Discard All Changes → 放弃所有更改/放棄所有變更/すべての変更を破棄/모든 변경 내용 삭제
- Apply → 应用/套用/適用/적용
- Save All → 保存全部/全部儲存/すべて保存/모두 저장

### Dialogs
- Restart required → 需要重启/需要重新啟動/再起動が必要です/재시작 필요
- Settings applied → 设置已应用/設定已套用/設定が適用されました/설정이 적용되었습니다
- Yes/No → 是/否、は/いいえ、예/아니요

## 语言切换流程

1. 用户在 SettingsView → Appearance 中选择语言
2. `handleLanguageChange` 被调用：
   - 更新 SettingsView 的 `UIControls.appearance.language`
   - 调用 `reaxel_I18n().setLanguage()` 更新渲染进程
   - 通过 `api.languageChange(language)` 发送 IPC 到主进程
3. 主进程接收 `language-change` 事件：
   - 调用 `reaxel_I18n().setLanguage()` 更新主进程
   - 调用 `menu().rebuildMenu()` 重建菜单
   - 调用 `updateTrayMenu()` 更新托盘菜单
4. 语言设置通过 `rehance_I18n_Persist` 自动持久化

## 技术要点

### 1. 进程隔离
- Renderer 和 Main 各自维护独立的 i18n 实例
- 通过 IPC 同步语言设置
- 避免直接共享状态

### 2. 动态加载
- 语言文件使用动态 import 懒加载
- 主进程使用 `/* webpackIgnore: true */` 避免 webpack 处理

### 3. 持久化
- 使用 `rehance_I18n_Persist` 自动保存语言选择
- 启动时自动恢复上次使用的语言

### 4. 类型安全
- 定义 `Languages` 类型确保类型一致
- IPC Schema 定义语言变更事件类型

## 未实现功能

以下功能已预留接口但未完全实现：

1. **系统语言自动检测**
   - 代码中已有监听 `system-info` 事件的逻辑
   - 需要主进程发送系统语言信息

2. **AI Views 的 i18n**
   - 当前仅 SettingsView 支持 i18n
   - AI 网页本身是外部网页，不受控制

3. **dialog 等 Electron API 的 i18n**
   - 部分 dialog 已使用 i18n
   - 可以进一步扩展到其他弹窗

## 测试建议

1. 启动应用，验证默认语言为 en-US
2. 打开 Settings → Appearance，切换不同语言
3. 验证：
   - SettingsView UI 文本立即更新
   - 主菜单文本更新
   - 托盘菜单文本更新
   - 重启应用后语言设置保持
4. 验证语言文件加载无错误
5. 验证缺失翻译文本显示 ERR_I18N_MISS 警告

## 注意事项

1. **不要对子工程外的文件做结构性改动** - 已遵守
2. **使用 Tab 或 3 空格缩进** - 已遵守项目编码规范
3. **Import 放在文件底部** - 已遵守
4. **所有翻译文本使用英文作为 source** - en-US 设置为 `isSource: true`
