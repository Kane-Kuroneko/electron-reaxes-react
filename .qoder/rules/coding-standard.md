---
trigger: always_on
description: 编码规范 - 缩进、命名、导入等通用编码标准
---

## 📐 缩进规范

### ✅ 正确做法

**所有代码文件优先使用 Tab 缩进，或使用 3 个空格**

```typescript
// ✅ 使用 Tab 缩进（推荐）
function fetchData() {
	const data = await api.getData();
	return data;
}

// ✅ 或使用 3 个空格缩进
function processData() {
   const result = transform(data);
   return result;
}
```

### ❌ 错误做法

```typescript
// ❌ 禁止使用 2 个空格缩进
function fetchData() {
  const data = await api.getData();  // 2 spaces - 不符合规范
  return data;
}

// ❌ 禁止使用 4 个空格缩进
function processData() {
    const result = transform(data);  // 4 spaces - 不符合规范
    return result;
}
```

### 📋 配置文件参考

项目 `.editorconfig` 已配置：
```ini
indent_style = tab
indent_size = 3
tab_width = 3
```

---

## 📦 Import 规范

### ✅ Import 位置

- **🔴 强制规则：所有 import/export 语句必须置于文件底部，而非顶部！**
- 按照以下顺序排列：
	1. **相对路径** - 如 `./components/*`, `../utils/*`
	2. **项目内部别名路径** - 如 `#main/*`, `#generics/*`, `#project/*`, `#root/*`
	3. **类型定义** - 如 `./index.d.ts`
	4. **第三方库** - 如 `electron`, `lodash`, `react`, `antd` 等
	5. **样式文件** - 如 `./index.less`, `./index.css`

```typescript
// ✅ 正确示例
const cssLoaderOptions = {
	sourceMap: true,
	modules: { ... }
};

export const webpackBaseConf:Configuration = { ... };

// import 语句统一放在文件底部
import { reaxel_SettingsView } from "#src/...";    // 别名路径
import { Button, Form, Menu } from 'antd';          // 第三方库
import { reaxper } from 'reaxes-react';             // 第三方库
import './index.less';                              // 最底部：样式文件
```

### ❌ 错误做法

```typescript
// ❌ 错误示例 - import 在顶部
import { app, BrowserWindow } from "electron";
import { reaxper } from 'reaxes-react';
import './index.less';

const win = new BrowserWindow({ ... });
```

---

## 🏷️ 命名规范

### Reaxel 命名

- **Reaxel 模块使用 kebab-case 命名**
- 目录名和文件名使用小写加连字符

```
# 正确示例
reaxels/
  ui-scale/
    index.ts
  runtime-paths/
    index.ts
  storage/
    index.ts
```

### 变量和函数命名

- **变量和函数使用 camelCase**
- **常量使用 UPPER_SNAKE_CASE**
- **类名和接口名使用 PascalCase**

```typescript
// ✅ 正确
const MAX_RETRY_COUNT = 3;
let userData = {};
function fetchUserData() {}
class UserService {}
interface IUserData {}
```

---

## 📝 代码格式


### 尾随空格

- **不强制要求删除尾随空格**（`trim_trailing_whitespace = false`）

---

## 🔍 代码审查检查清单

在 Code Review 时，请检查：

- [ ] 代码是否使用 Tab 或 3 空格缩进
- [ ] Import 语句是否集中在文件底部
- [ ] 命名是否遵循 camelCase/PascalCase/kebab-case 规范
- [ ] Reaxel 模块是否使用 kebab-case 命名

---

## 📚 参考文件

- **EditorConfig**: `.editorconfig`
- **TypeScript 配置**: `tsconfig.json`
- **项目结构**: `generic-services/reaxels/` (reaxel 命名参考)
