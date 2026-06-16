# FloatingView 卡片显示与实际切换 AI 不匹配 — 深度排查与修复

> 日期：2026-06-16 | 状态：已修复

## 问题描述

在连续快速按 Ctrl+] / Ctrl+[ 顺序切换 AI 时，FloatingView 轮播卡片高亮显示的 AI（`data-position="current"` 的卡片）与实际已切换到的 AI 页面不一致。

## 数据流回顾

```
用户快捷键 (Ctrl+])
  └→ Reaxel_View.turnToAiPageByOffset(offset, direction)
       ├→ reaxel_AIViews().showAIView(nextAI.id)       // 实际切换 View
       │    └→ Reaxel_View.setState({ currentAIViewKey }) // 同步更新
       └→ reaxel_FloatingView().api.showSwitchAiBar(payload)
            └→ IPC: 'floating-view-command' → 渲染进程
                 └→ reaxel_FloatingView.showSwitchAiBar(payload)
                      └→ setState.switchAiBar({ items, activeIndex, direction })
                           └→ SwitchAiBar: useEffect 检测 activeIndex 变化
                                └→ pending queue → slideNext()/slidePrev()
                                     └→ transitionEnd → updateSlidePositions()
```

## 根因分析

### 根因 1（关键）：`handleTransitionEnd` 从未绑定到 Swiper

`SwitchAiBar/index.tsx` 第 133-136 行定义了 `handleTransitionEnd`，注释明确说明它是 pending queue 的出队执行点：

```typescript
const handleTransitionEnd = useCallback( ( swiper : SwiperClass ) => {
    updateSlidePositions( swiper );
    processPendingStep( swiper );
} , [ processPendingStep ] );
```

但该回调**从未作为 prop 传递给 `<Swiper>` 组件**（第 191-217 行没有 `onTransitionEnd` prop）。

**后果**：pending queue 的 drain 链路断裂。快速切换时，第一张卡片的过渡完成后 queue 无人消费，后续步骤堆积。只有等到下一次 `useEffect` 触发（且 `!swiper.animating`）时才能再执行一步——这意味着 N 次快速按键最多只能执行 2 步（初始 useEffect + 下一次 useEffect），剩余的步骤被丢弃。Swiper 停留在错误的位置，但 `data-position` 却通过 `onSlideChange` 被设置为该位置的标签，视觉效果是**高亮卡片与 store.activeIndex 指向的真实 AI 不一致**。

### 根因 2（加剧）：pending queue 步数计算基于"增量 +1"而非实际 delta

```typescript
// 第 160 行（旧代码）
pendingStepsRef.current++;  // 总是只加 1
```

当 MobX 同步触发 React 重渲染、且多个 IPC 命令在同一个 effect 执行周期前到达时，`activeIndex` 可能跨越多个位置（如从 0 跳到 2）。但 pending queue 只增加 1 步，Swiper 只会移动 1 个位置而非 2 个。

**典型时序**：
1. IPC 命令 1：`activeIndex = 1`，React 渲染（同步），调度 effect
2. IPC 命令 2：`activeIndex = 2`，React 渲染（同步），调度 effect
3. Effect 执行时 `activeIndex` 已经是 2，`prevActiveIndexRef` 是 0，delta = 2
4. 旧代码：queue 只 +1，Swiper 从位置 0 移到 1（应该是 2）

### 根因 3（轻微加剧）：`onSlideChange` 过早更新 `data-position`

代码意图（注释第 15-18 行）是仅在 `transitionEnd` 更新 `data-position`，避免卡片还没滑到位就开始放大（跳动感）。但第 194 行实际将 `updateSlidePositions` 传给了 `onSlideChange`：

```tsx
onSlideChange={ updateSlidePositions }  // 与注释意图矛盾
```

这导致卡片在滑动中途就被标记为 `current` 并开始放大，视觉上产生"提前跳到下一张"的错觉，进一步模糊了实际当前位置。

## 修复方案

### 修改文件

`projects/ChatAIO/src/Views/FloatingView/components/SwitchAiBar/index.tsx`

### 修复 1：绑定 `onTransitionEnd`（核心修复）

```tsx
<Swiper
    ...
    onTransitionEnd={ handleTransitionEnd }  // 新增：恢复 pending queue drain 链路
>
```

这使 pending queue 能在每次过渡完成时自动出队执行下一步，保证连续快速切换时所有步骤依次消费。

### 修复 2：基于实际 delta 计算步数

```typescript
// 旧代码
pendingStepsRef.current++;  // 总是 +1

// 新代码：计算 wrap-around 感知的索引差
const total = items.length;
let steps: number;
if (direction === 'next') {
    steps = (activeIndex - prevIndex + total) % total;
} else {
    steps = (prevIndex - activeIndex + total) % total;
}
if (steps === 0 && activeIndex !== prevIndex) {
    steps = total;  // 同索引但方向不同：转一整圈
}
pendingStepsRef.current += steps;
```

### 修复 3：移除 `onSlideChange` 中的位置更新

```tsx
// 移除这行（与注释意图矛盾，导致提前放大）：
// onSlideChange={ updateSlidePositions }
```

`data-position` 现在只在两个时机更新：
- Swiper 初始化时（`onSwiper` / `handleSwiper`）
- 过渡完成时（`onTransitionEnd` / `handleTransitionEnd`）

### 不变的部分

| 组件 | 说明 |
|------|------|
| IPC 通道 `'floating-view-command'` | 类型、payload 结构完全不变 |
| Main 进程 `reaxel_FloatingView` | BrowserWindow 管理、IPC 发送不涉及 |
| `Reaxel_View` | `showAIView` 同步更新 `currentAIViewKey`，逻辑正确 |
| Renderer `reaxel_FloatingView` | store 结构、`showSwitchAiBar` 不变 |
| 样式 `index.less` | 完全不变 |
| `shouldIgnoreDuplicateSwitch` (40ms 去重) | 本次不动；它与"卡片显示错位"无关（它导致的是吞命令，不是错位） |

## 验证方式

1. `npm start ChatAIO` 启动应用
2. 准备 5+ 个活跃 AI
3. **快速连续**按 Ctrl+]（按住不放以触发键盘重复）至少 5 次
4. 检查 FloatingView 卡片的高亮 AI 是否与左下角显示的当前 AI 页面一致
5. 同样测试 Ctrl+[ 反向快速切换
6. 正常速度单次切换（验证没有引入回归）
7. 2 秒无操作后 FloatingView 正常自动隐藏
