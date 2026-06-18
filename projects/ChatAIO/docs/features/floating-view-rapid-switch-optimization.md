# FloatingView 快速切换动画优化

> 2026-06-19 — 解决高频切换 AI cards 时 Swiper 动画阻塞导致的卡顿和不跟手

## 问题描述

用户通过快捷键（Ctrl+[/]、Alt+[/]、Ctrl+Tab）连续高频切换 AI 页面时，
SwitchAiBar 卡片轮播出现"卡顿不跟手"——视觉位置远远落后于实际活跃的 AI 索引。

## 根因分析（基于 performance-logs）

### 数据证据

从 `perf-2026-06-18T11-51-41.jsonl` 中可观测到：

| 环节 | 耗时 | 结论 |
|------|------|------|
| 主进程 switch:start → ipc-sent | 15-25ms | 极快 |
| IPC 传输 (main → renderer) | <2ms | 极快 |
| 渲染进程 state 更新 | <1ms | 极快 |
| **Swiper 单步过渡 (300ms CSS)** | **300ms** | **瓶颈** |
| 用户按键间隔 | 130-175ms | 快于动画时长 |

### 瓶颈本质：动画背压（Animation Backpressure）

1. 用户每 ~150ms 发一条切换指令
2. Swiper `loopPreventsSliding=true`（默认）在动画进行中阻断 slideNext/slidePrev
3. 被阻断的步骤入 pending 队列，在 `onTransitionEnd` 依次出队执行
4. 每步出队后仍需 300ms 完成 → 队列只进不出，深度不断增长
5. 最终表现：按键 5 次后视觉才从第 1 步开始追赶，延迟 >1s

**结论：非 CPU 瓶颈，而是 Swiper CSS 过渡时长的串行阻塞。**

## 技术方案演进

### V1：即时跳跃 + 微过渡（已弃用）

快速切换时 `slideToLoop(index, 0)` 即时定位 + 60ms CSS 微过渡。
问题：**无方向动画**——用户无法感知滚动方向，视觉上卡片"瞬移"。

### V2：Interrupt & Redirect + 方向短动画（当前方案）

#### 核心思想

```
设置 loopPreventsSliding: false
→ 动画进行中允许 slideNext/slidePrev 继续调用
→ 浏览器 CSS transition 天然中断重定向
→ 从当前视觉位置开始向新目标动画
→ 每次切换都有方向感知，无排队无丢帧
```

#### Swiper 源码验证（swiper-core.mjs）

关键发现：
1. `loopPreventsSliding` 仅影响 `slideNext/slidePrev`，不影响 `slideTo/slideToLoop`
2. `slideTo` 不受 `preventInteractionOnTransition` 限制（默认 false）
3. 当 `loopPreventsSliding: false` 时，动画中 `slideNext/slidePrev` 正常执行
4. `slideTo` 在动画中重新调用时：
   - `setTransition(speed)` 更新过渡时长
   - `setTranslate(target)` 更新目标位置
   - CSS transition 从当前计算位置开始向新目标动画（浏览器原生行为）
5. `loopFix` 内部的重定位使用 `speed=0`，与外层 `slideTo(speed)` 在同一同步执行中，
   浏览器批处理样式变更——中间重定位不可见

#### 双模式策略

| 场景 | 检测条件 | 行为 |
|------|---------|------|
| 单步慢切换 | 距上次切换 > 250ms | 300ms Swiper 标准动画 |
| 快速连续切换 | 距上次切换 ≤ 250ms | 120ms 短动画，方向保证 |

#### 参数设计

- **快速切换阈值** = 250ms
  - 理由：略小于 300ms 标准动画时长，确保"上一动画还在进行时新指令到达"即触发
- **快速动画时长** = 120ms
  - 理由：
    - 足够短：用户典型间隔 ~150ms，120ms 动画在下次按键前大概率完成
    - 足够长：明确可见的方向性滑动动画
    - 即使被中断也无害：CSS transition 自动从中断位置重定向
- **快速缓动** = `cubic-bezier(0.25, 0.8, 0.25, 1)`
  - 理由：与标准动画相同缓动，视觉一致性

#### 方向保证

始终使用 `slideNext()` / `slidePrev()` 而非 `slideToLoop()`：
- `slideNext` → wrapper 永远向左滑（视觉上卡片向右流动）
- `slidePrev` → wrapper 永远向右滑（视觉上卡片向左流动）
- 在 loop 边界通过 Swiper clone 无缝循环，方向不反转

#### 架构简化

**彻底移除 pending 队列**：
- `loopPreventsSliding: false` 使得动画中继续调用不被阻断
- 每次 `activeIndex` 变化直接执行 `slideNext/slidePrev(speed)`
- CSS transition 自动处理中断和重定向
- 代码从 ~392 行精简至 ~270 行

### CSS 变更

```less
/* 快速模式：卡片 scale/color 过渡匹配 Swiper 滑动时长 */
@rapid-transition-duration: 120ms;
@rapid-transition-easing: cubic-bezier(0.25, 0.8, 0.25, 1);

.switch-ai-bar--rapid .switch-ai-bar__item {
    transition-duration: @rapid-transition-duration !important;
    transition-timing-function: @rapid-transition-easing !important;
}
```

### 架构契约保持

- **reaxel 状态管理不变**：FloatingView reaxel 的 store/setState 接口不变
- **IPC 通信不变**：主进程 → 渲染进程的 command 格式不变
- **Swiper 核心配置不变**：loop/centeredSlides/slidesPerView 保持
- **仅渲染层优化**：变更集中在 SwitchAiBar 组件内部
- **新增 Swiper 配置**：`loopPreventsSliding: false`

## 性能采集

`SwitchScenarioProfiler` 类（已集成）：
- rAF 帧率采样
- rapid-jump 计数
- 会话统计（隐藏时输出）

## 修改文件清单

1. `src/Views/FloatingView/components/SwitchAiBar/index.tsx` — Interrupt & Redirect 核心实现
2. `src/Views/FloatingView/index.less` — rapid 模式 CSS 时长调整
3. `src/shared/utils/switch-perf-recorder.utility.ts` — SwitchScenarioProfiler

## 预期效果

| 指标 | V1 (即时跳跃) | V2 (Interrupt & Redirect) |
|------|--------------|--------------------------|
| 方向感知 | 无（瞬移） | 有（120ms 滑动动画） |
| 连续切换延迟 | ~60ms | ~120ms |
| 视觉跟手感 | 即时但无方向 | 即时且有方向 |
| pending 队列深度 | 0 | 0（队列已移除） |
| 单步慢切换 | 300ms 平滑 | 300ms 平滑（不变） |
| 被中断时的行为 | N/A | CSS 自动重定向，无卡顿 |
| 方向翻转 | 无感 | slideNext/slidePrev 保证 |
