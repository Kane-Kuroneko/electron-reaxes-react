/**
 * 将reaxel-chats与数据库进行关联
 */
import { createQuickPromptTable } from "#main/services/DB/QuickPrompts/create-table.db";

export const rehance_QuickPrompts_SQLIO = ( {
	store ,
	setState ,
	mutate,
}:ReaxelQuickPrompts ) => () => {
	
	async function readQuickPromptsFromDB() {
		const groups = await db.select().from(quickPromptGroups);
		
		const multiIds = groups.filter(g => g.type === 'group::multi').map(g => g.quick_prompt_group_id);
		const singleIds = groups.filter(g => g.type === 'group::single').map(g => g.quick_prompt_group_id);
		
		const multiOptionsList = multiIds.length
			? await db.select().from(multiOptions).where(inArray(multiOptions.fk_quick_prompt_group_id, multiIds))
			: [];
		const singleOptionsList = singleIds.length
			? await db.select().from(singleOptions).where(inArray(singleOptions.fk_quick_prompt_group_id, singleIds))
			: [];
		
		const presets: PromptGroup[] = groups.map(g => {
			if (g.type === 'group::multi') {
				const options = multiOptionsList
				.filter(o => o.fk_quick_prompt_group_id === g.quick_prompt_group_id)
				.map(o => o.quick_prompt_multi_option_id);
				return {
					...g,
					type: "group::multi", // 明确指定类型
					preset_group_id: g.quick_prompt_group_id,
					multi_options: options,
					updated_at: g.updated_at ?? Date.now(),
				};
			} else {
				const options = singleOptionsList
				.filter(o => o.fk_quick_prompt_group_id === g.quick_prompt_group_id)
				.map(o => o.quick_prompt_single_option_id);
				return {
					...g,
					type: "group::single", // 明确指定类型
					preset_group_id: g.quick_prompt_group_id,
					single_options: options,
					updated_at: g.updated_at ?? Date.now(),
				};
			}
		});
		return presets;
	}
	
	//初始化时,从数据库读取数据到store
	(async () => {
		const presets = await readQuickPromptsFromDB();
		setState({
			presets,
		})
	} )();
	
	return {
		
	};
};

import { QuickPrompt } from '#src/types/QuickPrompt';
import { quickPromptGroups,plainPrompts,multiOptions,singleOptions } from '#main/services/DB/QuickPrompts/schema';
import {type ReaxelQuickPrompts , type PromptGroup} from '../';
import { db } from "#main/services/DB";
import { relations } from 'drizzle-orm';
import { inArray, eq } from 'drizzle-orm'
