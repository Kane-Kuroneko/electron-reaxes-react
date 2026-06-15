# FloatingView SwitchAiBar — Swiper 迁移

> 日期：2026-06-16 | 状态：规划中

## 背景

当前 FloatingView 的 `SwitchAiBar` 组件使用自定义双轨 CSS 动画实现 AI 切换卡片轮播。该实现有以下问题：

1. **动画逻辑复杂**：组件内维护 `exitTrack`/`animKey`/`useLayoutEffect`/`animationend` 等约 50 行动画状态管理
2. **Payload 位置计算冗余**：主进程 `createSwitchAiBarPayload` 手动计算 Swiper 风格的 5 位置偏移（far-prev → far-next），约 60 行逻辑存在于已过厚的 `Reaxel_View`（442 行，fixme.md P2-06 已记录）
3. **CSS 关键帧动画脆弱**：slide-distance 需精确匹配卡片宽度+间距，响应式改动时需同步维护两处

**目标**：用 Swiper 12（已存在于根 `package.json` 依赖）替换自定义组件和动画，简化架构同时保持视觉一致性。

## 架构对比

### 不变的层

| 层次 | 说明 |
|------|------|
| IPC 通道 | `'floating-view-command'` (MainToRenderer)，类型声明不变 |
| Main 进程 `reaxel_FloatingView` | BrowserWindow 管理 + IPC 发送，完全不变 |
| Renderer `App.tsx` | IPC 监听桥接，不变 |
| Renderer `reaxel_FloatingView` | UI 状态管理 + 自动隐藏定时器，store 结构简化 |
| 全局消息 (`GlobalMessage`) | antd message 调用，完全不变 |

### 变化的层

| 层次 | 旧实现 | 新实现 |
|------|--------|--------|
| `Types/FloatingView.d.ts` | `SwitchAiBarItem` 含 `position` 字段；`SwitchAiBarPayload` 含 `sequence`/`currentId`/`direction` | `SwitchAiBarItem` 移除 `position`；`SwitchAiBarPayload.items` 发送**全部**活跃 AI |
| `Reaxel_View.createSwitchAiBarPayload` | 约 60 行位置偏移计算 + 排序 | 简化为数组映射 + indexOf |
| `SwitchAiBar` 组件 | 112 行自定义双轨动画 | ~80 行 Swiper React 组件 |
| `index.less` | 4 个 @keyframes + exit/enter 轨道样式 | Swiper CSS + `[data-position]` 选择器 |

## 数据流对比

```
旧:
主进程 Reaxel_View
  └→ createSwitchAiBarPayload(items, currentIndex, direction)
       └→ 计算 1-5 个带 position 的窗口项 → SwitchAiBarPayload
            └→ IPC → 渲染进程 reaxel_FloatingView.showSwitchAiBar(payload)
                 └→ store.switchAiBar = { visible, direction, items, currentId, sequence, total }
                      └→ SwitchAiBar 通过 useLayoutEffect 检测 sequence 变化
                           └→ 双轨 CSS 动画（exitTrack 滑出 + enterTrack 滑入）

新:
主进程 Reaxel_View
  └→ createSwitchAiBarPayload(allItems, activeIndex)
       └→ 全部活跃 AI 的 {id, label, family}[] + activeIndex → SwitchAiBarPayload
            └→ IPC → 渲染进程 reaxel_FloatingView.showSwitchAiBar(payload)
                 └→ store.switchAiBar = { visible, items, activeIndex, total }
                      └→ SwitchAiBar: Swiper key 变化 → slideToLoop(activeIndex)
                           └→ Swiper 内置 slide 过渡（300ms cubic-bezier）
```

## Swiper 配置策略

### 核心参数

```typescript
{
    centeredSlides: true,           // 当前卡片居中
    slidesPerView: 动态计算,         // 1→1 / 2-3→3 / 4+→5
    spaceBetween: 2,                // 卡片间距 2px（与原设计一致）
    speed: 300,                     // 过渡 300ms（与原设计一致）
    allowTouchMove: false,          // 仅程序控制，禁用触摸
    watchSlidesProgress: true,      // 暴露 slide 进度供 CSS 使用
    loop: true,                     // 永远启用（loop clone 填充空位）
    loopAdditionalSlides: 0,           // 默认，靠 item 重复策略补齐 slide 数
}
```

### slidesPerView 与 loop 决策表

| AI 数量 | slidesPerView | loop | item 重复份数 | 说明 |
|---------|--------------|------|-------------|------|
| 1 | 1 | ✅ | 3 份 | `ceil(3/1)`，3 张有效 slide |
| 2 | 3 | ✅ | 4 份 | `ceil(7/2)`，8 张有效 slide |
| 3 | 3 | ✅ | 3 份 | `ceil(7/3)`，9 张有效 slide |
| 4 | 5 | ✅ | 3 份 | `ceil(11/4)`，12 张有效 slide |
| 5 | 5 | ✅ | 3 份 | `ceil(11/5)`，15 张有效 slide |
| 6-10 | 5 | ✅ | 2 份 | `ceil(11/6)`~`ceil(11/10)`，12~20 张 |
| 11+ | 5 | ✅ | 1 份 | 无需重复，原生 loop 满足要求 |

`repeatTimes = max(1, ceil((slidesPerView + ceil(slidesPerView/2) × 2) / total))`

> **公式变更**（2026-06-16 bugfix）：原公式 `slidesPerView + 1` 对 centeredSlides 不足——
> loopFix 的 append 分支在 `cols - loopedSlides * 2` 约束下只会追加远少于需求的 slide 数，
> 导致 far-next 位置无 slide 可用。新公式 `slidesPerView + ceil(slidesPerView/2) × 2`
> 保证 loopFix 无论从哪个方向逼近边界都有充足 slide 填满全部可见位置。

### 方向保证机制

- `slideToLoop` 总是走**最短路径**，在边界处可能反向滑动（不符合"向前=向左"的 UX 契约）
- 改用 **`slideNext()` / `slidePrev()`**，这两个方法在 loop 模式下永远沿指定方向滑动，到边界时通过 loop clone 无缝循环回对端
- `direction` 字段由主进程在 `turnToAiPageByOffset` 中确定（`offset > 0 → 'next'`，`offset < 0 → 'previous'`），经 payload 传递给组件
- 组件通过 `prevActiveIndexRef` 比对检测 activeIndex 变化，避免 Swiper 初始定位（`initialSlide`）误触发 slide

## 卡片样式策略

不使用 Swiper 内置的 Coverflow 效果（该效果偏 3D 旋转，与当前平面缩放+透明度设计不匹配）。改为通过 Swiper 的 `onSlideChange` 回调在 slide DOM 上设置 `data-position` 属性，CSS 据此应用缩放、透明度和渐变色。

```typescript
// 在 onSlideChange 中
swiper.slides.forEach((slide, i) => {
    const offset = i - swiper.activeIndex;
    const position = offset === 0 ? 'current'
        : offset === -1 ? 'near-prev' : offset === 1 ? 'near-next'
        : offset <= -2 ? 'far-prev' : 'far-next';
    slide.setAttribute('data-position', position);
});
```

CSS 保留原设计的毛玻璃视口、卡片渐变色彩和阴影风格，仅将动画控制权交给 Swiper。

## 响应式断点

通过 Swiper 的 `breakpoints` 配置 + CSS media query 双层控制：

```typescript
breakpoints: {
    0: { slidesPerView: 5, spaceBetween: 2 },   // 移动端基础配置
    520: { slidesPerView: 5, spaceBetween: 2 },  // 桌面端
}
```

卡片实际宽度仍由 CSS 控制（桌面 130px，移动 95px），通过 `@media (max-width: 520px)` 切换。

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `Types/FloatingView.d.ts` | 修改 | 简化 `SwitchAiBarItem`/`SwitchAiBarPayload` |
| `Main/reaxels/Views/index.ts` | 修改 | 简化 `createSwitchAiBarPayload`，删除位置计算 |
| `Views/FloatingView/reaxels/floating-view/index.ts` | 修改 | 简化 store 结构，移除 sequence/currentId |
| `Views/FloatingView/components/SwitchAiBar/index.tsx` | 重写 | Swiper React 实现 |
| `Views/FloatingView/index.less` | 重写 | 移除 @keyframes，添加 Swiper + [data-position] 样式 |
| `docs/features/floating-view-swiper-migration.md` | 新建 | 本文档 |

## 验证方式

1. `npm start ChatAIO` 启动应用
2. 使用 Ctrl+] / Ctrl+[ 切换 AI 页面
3. 检查项：
   - [ ] 向前切换（Ctrl+]）时卡片**永远向左**移动，到边界无缝循环，永不跳卡
   - [ ] 向后切换（Ctrl+[）时卡片**永远向右**移动，到边界无缝循环
   - [ ] 当前卡片居中高亮（1.0 scale, 彩色渐变）
   - [ ] near 卡片略微缩小（0.87 scale），far 卡片更小（0.73 scale）
   - [ ] 毛玻璃视口效果保留
   - [ ] 2 秒无操作自动隐藏
   - [ ] 1 个/2-3 个/4+ 个 AI 时卡片位置占满（3 或 5 格），无空白
   - [ ] 移动端（<520px 窗口）卡片缩小、间距正常
   - [ ] 全局消息（关闭最后一个 AI 时的警告）正常显示
