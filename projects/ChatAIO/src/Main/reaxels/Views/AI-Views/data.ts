// AI Family keys — 能力列表仍来自 AI-family.ts，不是目录。
export const AIKeys: AI.AIFamily[] = [ ...AIFamily ];

export type AIView = {
	AIName : AI.AIFamily ,
	view : WebContentsView,
	label: string,
	domain : string,
}

/**
 * Session/window 名约定：family 里的 `-` 换成 `_`，再加 `_window`。
 * 例：chatgpt → chatgpt_window，meta-ai → meta_ai_window。
 * 不再从已删除的 family 域名表查找。见 docs/feature-proposal--ai-catalog-source.md 批次 2。
 */
export function getBrowserNameByFamily(family: AI.AIFamily): string {
	return `${ String( family ).replace( /-/g , '_' ) }_window`;
}

import { AIFamily } from '#shared/statics/AI-family';
import { AI } from "#src/Types/SettingsTypes/AI";
import { WebContentsView } from "electron";
