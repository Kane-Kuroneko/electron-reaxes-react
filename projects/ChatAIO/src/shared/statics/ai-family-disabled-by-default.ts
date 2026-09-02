/**
 * App 策略：第一启动映射种子页时，这些 family 默认关闭。
 * 纯信息，无函数。不是供应商目录事实源（见 statics/ai-catalog/default-ais.json）。
 * 用户点过启用后写在 user-ais，不再跟这张表。
 * 映射（vendorToAIItem）读本文件，定义不和名单混文件。
 * 见 docs/architecture/ai-config.md、docs/feature-proposal--ai-catalog-source.md。
 */

export const FAMILY_DISABLED_BY_DEFAULT = [
	'manus' ,
	'aistudio' ,
	'copilot' ,
	'meta-ai' ,
	'poe' ,
	'mistral' ,
	'chatglm' ,
	'yuanbao' ,
	'hailuo' ,
	'yiyan' ,
] as const satisfies readonly AI.AIFamily[];

import type { AI } from '#src/Types/SettingsTypes/AI';
