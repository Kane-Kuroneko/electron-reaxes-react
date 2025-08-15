const raw = "有，`yarn` 也支持类似 `npm link` 的机制，用于本地包的链接与调试，但其行为略有差异。\n\n---\n\n### ✅ yarn 中的等价命令是：\n\n#### 1. 在包目录下执行（创建全局链接）：\n```bash\nyarn link\n```\n\n这会将当前包注册为全局链接，供其他项目引用。它会把当前目录下的包名注册到全局 Yarn 链接中。\n\n---\n\n#### 2. 在使用该包的项目中执行（建立链接）：\n```bash\nyarn link <包名>\n```\n\n注意 `<包名>` 是 `package.json` 中的 `name` 字段内容。\n\n这会将当前项目中的 `node_modules/<包名>` 指向你刚才 `yarn link` 的本地包路径。\n\n---\n\n### 🔁 取消链接：\n\n#### 在消费端项目中取消链接：\n```bash\nyarn unlink <包名>\n```\n\n#### 如果你想彻底移除全局链接（在开发包中）：\n```bash\nyarn unlink\n```\n\n---\n\n### ⚠️ 注意事项：\n\n- `yarn link` 和 `npm link` 在模块解析和依赖版本处理上略有不同，可能出现依赖重复的问题（多个 React 实例等），建议用于调试，不建议用于生产构建流程。\n- 若使用 `pnpm`，其对 `link` 的支持方式更接近硬链接的真实行为（支持 `pnpm link --global` 等），但这属于另一套机制。\n\n--- \n\n结论：  \n`yarn link` 功能上与 `npm link` 等价，用于本地包开发调试。";


export const LLMMessage = reaxper( (props:LLMMessageProps) => {
	
	
	return <div className = { less.llmMessage }>
		<div className="md-content">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeHighlight]}
			>{
				raw
			}</ReactMarkdown>
		</div>
	</div>;
} );

export type LLMMessageProps = {}


import ReactMarkdown from 'react-markdown';

import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';


import less from './index.module.less';
