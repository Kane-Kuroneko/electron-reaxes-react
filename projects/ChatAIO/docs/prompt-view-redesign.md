# PromptView UI Redesign

创建时间：2026-06-11
状态：已实现

---

## 1. 实现概要

| 方面 | 变更 |
|------|------|
| 配色 | 绿色 → 紫罗兰 (#7c3aed / #a78bfa)，更深沉克制的灰度背景 |
| 图标 | @ant-design/icons → lucide-react 统一体系 (2px 描边) |
| 边框 | 1px solid 硬边框 → rgba 半透明 (0.04-0.08) 呼吸感边框 |
| 阴影 | 单层 → 三层阴影系统 (sm/md/lg) |
| 卡片 | 悬浮态 + 拖拽缩放动画，玻璃态 accent 背景 |
| 按钮 | icon-button hover 用 accent 染色 + 背景，danger 按钮用红色 |
| 旋转 | Loader2 + CSS @keyframes prompt-spin 0.9s |

## 2. CSS 变量

- Light: bg #f5f3f7, accent #7c3aed
- Dark:  bg #0b0b10, accent #a78bfa
- 三层 shadow: --prompt-shadow-sm/md/lg
- 三层 radius: --prompt-radius-sm/md/lg (6/10/14px)

## 3. 图标映射

| 用途 | lucide icon |
|------|-------------|
| Header kicker | FileText |
| Add | Plus |
| Drag | GripVertical |
| Duplicate | CopyPlus |
| Copy text | ClipboardCopy |
| Delete | Trash2 |
| Saving (spin) | Loader2 |
| Saved | CircleCheck |

## 4. 依赖

- lucide-react@0.454.0 (新增，6.8KB gzipped)
- @ant-design/icons (移除 PromptView 中引用，其他 View 保持不变)
