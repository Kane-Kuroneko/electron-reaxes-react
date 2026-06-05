# Menu AI 名称宽度规整模块

## 结论

`menu-label-width.ts` 用于规整 AI-WebApp 主窗口原生菜单栏里的 `Previous` / `Next` 顶层菜单标签，使其中的 AI 名称部分尽量保持固定视觉宽度。

它解决的问题是：Electron 原生菜单无法像 DOM/CSS 一样指定菜单字体、固定文本容器宽度或使用 `text-overflow: ellipsis`。当 AI 名称从 `Claude` 切到 `Perplexity-Anselmddddddddddddd` 这类长字符串时，原生菜单栏会按真实字体重新计算宽度，导致窗口菜单栏横向跳变。

本模块做的事是：

- 把 AI 名称段规整到一个固定目标宽度。
- 名称过长时截断并追加 ASCII `"..."`。
- 名称过短时追加多种 Unicode 空白字符补齐。
- 用接近 Windows 菜单字体的实测像素宽度表估算字符宽度。
- 对 Electron 菜单 label 中的 `&` 做转义，避免被宿主菜单系统当作 mnemonic accelerator。

## 技术背景

AI-WebApp 的 `Previous` / `Next` 是 Electron main thread 中的原生菜单项，入口在 `src/Main/reaxels/Menu/index.ts`。菜单通过 `Menu.buildFromTemplate()` 创建，最终交给宿主系统绘制。

和 renderer 内的 HTML 不同，原生菜单有几个限制：

- 不能用 CSS 指定 `font-family: monospace`。
- 不能给 label 内部某一段文字设置固定宽度。
- 不能直接使用 DOM 的 `measureText()` 或 `text-overflow`。
- Electron 暴露的是 `MenuItemConstructorOptions.label` 这种字符串 API，宽度计算由 Chromium / Electron / OS 菜单实现共同决定。
- 在 Windows 和 Linux 上，菜单 label 中的 `&` 有 accelerator mnemonic 含义，需要写成 `&&` 才能显示字面量 `&`。

Windows 上有系统菜单字体概念。当前开发环境实测为 `Segoe UI 9pt`，用 `System.Drawing.SystemFonts.MenuFont` 和 `Graphics.MeasureString(..., GenericTypographic + MeasureTrailingSpaces)` 取得一组常见字符的近似宽度。这个测量方式不能保证和 Electron 原生菜单 100% 一致，但比“字符数量”或“粗略英文大小写权重”稳定得多。

## 方案选择

选用“字符串规整 + 像素宽度估算 + Unicode 空白补齐”的方案。

没有选择的方案：

- **改成等宽字体**：原生菜单字体不能由 Electron menu label 单独控制。
- **把 Previous / Next 做成 renderer UI**：可以精确控制布局，但会改变交互层级和原生菜单行为，影响范围过大。
- **只限制字符数量**：比例字体下 `Claude`、`Gemini`、`Perplexity`、`mmmm`、`iiii` 的真实宽度差异很大，无法解决跳变。
- **只使用普通空格补齐**：普通空格宽度粒度太粗，且连续普通空格在不同宿主实现里可能有额外处理风险。
- **运行时调用系统 API 每次测量**：会引入平台差异、native API 依赖和 main process 复杂度。当前需求只需要降低菜单栏抖动，静态测量表更轻量。

当前方案的取舍：

- 在 Windows 当前菜单字体上精度高。
- 纯 TypeScript 模块，无 Electron 运行时依赖，易验证。
- 对 macOS / Linux 只能算近似，因为原生菜单字体和渲染栈不同。
- 仍然无法做到真正的像素级不抖动，因为宿主菜单不是由应用完全绘制。

## 实现原理

### 固定目标宽度

`MENU_AI_NAME_TARGET_WIDTH` 当前为 `108`。它表示 AI 名称段的目标估算像素宽度。

选择这个值的依据：

- 能完整容纳默认配置中较长的 `AI-Web (Proxy Test)`。
- 对 `Perplexity-Anselmddddddddddddd` 这类过长名称，会截为 `Perplexity-Anselm...` 附近的可读长度。
- 对 `Claude`、`Grok` 这类短名称，补齐后不会让菜单栏过度膨胀。

### 文本标准化

输入名称会先执行：

- 连续空白压缩为单个普通空格。
- 去除首尾空白。
- 空字符串回退为 `AI`。

这样可以避免用户输入不可见空白导致估算失真。

### 截断逻辑

当名称估算宽度超过目标宽度时：

1. 使用 `Intl.Segmenter` 按 grapheme cluster 拆分字符串。
2. 逐段累加宽度。
3. 保证追加 `"..."` 后不超过目标宽度。
4. 最后再进入补齐逻辑，让截断后的字符串仍尽量贴近目标宽度。

按 grapheme cluster 拆分是为了避免把 emoji、组合音标、变体选择符这类字符切坏。若运行环境没有 `Intl.Segmenter`，会回退到 `Array.from(text)` 按 code point 拆分。

### 宽度估算

模块内置 `MENU_MEASURED_TEXT_WIDTHS`，记录常用 ASCII、数字、标点和多种空白字符在 Windows `Segoe UI 9pt` 菜单字体下的近似宽度。

未命中的字符按类型回退：

- CJK：约 `12.57`
- Hangul：约 `12`
- emoji-like：约 `12`
- 其他未知字符：约 `7`

组合音标、零宽连接符和变体选择符按 `0` 处理。

### 空白补齐

短文本或截断文本需要补齐到目标宽度。模块不会只重复一个空格，而是从多种 Unicode 空白里组合：

- Ideographic Space
- Em Space
- Figure Space
- En Space
- Three-Per-Em Space
- No-Break Space
- Four-Per-Em Space
- Medium Mathematical Space
- Punctuation Space
- Thin Space
- Six-Per-Em Space
- Hair Space

补齐算法用动态规划在离散化后的宽度空间里搜索组合，目标是：

- 实际估算宽度最接近目标宽度。
- 允许极小 overshoot，避免永远偏短。
- 同等误差下倾向使用更短的 padding 字符串。

这比贪心填充更稳定。例如只用大空白字符会经常剩下无法精确填补的宽度碎片，导致短名和长名的视觉宽度仍然不同。

### `&` 转义

Electron 原生菜单 label 在部分平台会把 `&` 解释为 mnemonic。`escapeElectronMenuBarLabel()` 会把所有 `&` 替换成 `&&`。

这主要影响 AI 名称中包含 `AT&T` 一类字符串的情况。没有转义时，菜单可能隐藏 `&` 或把下一个字符作为快捷助记键。

## 调用方式

`Menu/index.ts` 中只需要对 AI 名称段调用 `fitMenuAIName()`，再对完整顶层 label 调用 `escapeElectronMenuBarLabel()`：

```typescript
const createAdjacentAIMenuLabel = (
   emoji:string ,
   label:string ,
   ai:Settings['AIs'][number] | null,
) => {
   if( !ai ) {
      return escapeElectronMenuBarLabel( `${ emoji } ${ label }` );
   }
   return escapeElectronMenuBarLabel( `${ emoji } ${ label } ${ fitMenuAIName( ai.label || ai.id ) }` );
};
```

模块公开导出：

```typescript
export {
   escapeElectronMenuBarLabel ,
   fitMenuAIName ,
   getMenuTextWidth ,
   MENU_AI_NAME_ELLIPSIS ,
   MENU_AI_NAME_TARGET_WIDTH,
};
```

其中：

- `fitMenuAIName(name)`：返回规整后的 AI 名称字符串。
- `getMenuTextWidth(text)`：返回模块估算宽度，主要用于验证和调试。
- `escapeElectronMenuBarLabel(label)`：转义完整菜单 label 中的 `&`。
- `MENU_AI_NAME_TARGET_WIDTH`：当前名称段目标宽度。
- `MENU_AI_NAME_ELLIPSIS`：当前固定为 ASCII `"..."`。

## 验证方式

可用 `tsx` 直接验证纯模块输出：

```typescript
import {
   fitMenuAIName ,
   getMenuTextWidth ,
   MENU_AI_NAME_TARGET_WIDTH,
} from './projects/AI-WebApp/src/Main/reaxels/Menu/menu-label-width.ts';

const names = [
   'Claude' ,
   'Perplexity-Anselmddddddddddddd' ,
   'AI-Web (Proxy Test)' ,
];

for( const name of names ) {
   const fitted = fitMenuAIName( name );
   console.log( {
      name ,
      fitted ,
      width : getMenuTextWidth( fitted ) ,
      target : MENU_AI_NAME_TARGET_WIDTH,
   } );
}
```

当前关键样例的验证结果：

- `Claude`：补齐后约 `108px`
- `Perplexity-Anselmddddddddddddd`：截断为 `Perplexity-Anselm...` 后约 `107.96px`
- `AI-Web (Proxy Test)`：补齐后约 `108.06px`

## 不健壮性与边界情况

### 平台差异

宽度表来自 Windows `Segoe UI 9pt` 菜单字体。macOS、Linux、Windows 用户修改系统菜单字体或缩放策略后，真实菜单宽度会不同。

影响：仍然比字符数量算法稳定，但不能保证像素级一致。

### Electron / Chromium / OS 渲染差异

Electron 的 menu label 最终由宿主菜单系统绘制，真实宽度可能受 Electron 版本、Chromium 版本、DPI、字体 fallback、菜单样式和平台主题影响。

影响：模块只能降低跳变，不能消除所有跳变。

### Unicode 空白兼容性

模块使用多种 Unicode 空白字符。主流原生菜单通常会显示这些空白，但不同平台可能对某些空白字符宽度处理不同，也可能把某些字符 fallback 到别的字体。

影响：某些平台上补齐精度会下降。

### 未知字符和复杂 emoji

未知字符按回退宽度估算。复杂 emoji 序列、带肤色修饰符的 emoji、组合文字和罕见 Unicode 字符不一定精确。

影响：包含大量这类字符的 AI 名称可能仍有宽度偏差。

### 翻译文本变化

本模块只规整 AI 名称段，不固定 `Previous` / `Next` 本身的翻译文本宽度。不同语言下 `Previous` 和 `Next` 的宽度可能仍不同。

影响：如果未来要求整个顶层菜单项宽度完全一致，需要把 `label` 文本段也纳入规整，或者为 previous / next 分别设定完整 label 的目标宽度。

### 菜单项 accelerator 区域

本模块只处理顶层 menu bar label。子菜单项中带 accelerator 的行还有系统绘制的快捷键区域，不应套用这个补齐策略。

影响：不要把 `fitMenuAIName()` 用到普通下拉菜单项的完整 label 上，除非已经确认宿主菜单渲染行为符合预期。

## 维护建议

- 调整 `MENU_AI_NAME_TARGET_WIDTH` 时，至少验证 `Claude`、`Grok`、`AI-Web (Proxy Test)`、`Perplexity-Anselmddddddddddddd`。
- 如果未来主要运行平台切换到 macOS 或 Linux，应重新采样对应平台的菜单字体宽度。
- 如果新增默认 AI 名称明显长于 `AI-Web (Proxy Test)`，需要重新评估目标宽度。
- 不要把 ASCII `"..."` 改成单字符 `…`，除非产品要求改变省略号样式；当前需求明确要求替换为 `"..."`。

## 参考资料

- Electron Menu API: <https://www.electronjs.org/docs/latest/api/menu>
- Electron MenuItem API: <https://www.electronjs.org/docs/latest/api/menu-item>
- Windows `NONCLIENTMETRICS.lfMenuFont`: <https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-nonclientmetricsw>
