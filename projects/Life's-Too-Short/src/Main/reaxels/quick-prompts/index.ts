

/**
 * 预设提示词包含两个大类:
 * - selectable:从group中选择子项,又可以细分为多选和单选
 * - plain:普通的提示词,可以是多模态的(声音/图片等)
 */
export const reaxel_QuickPrompts = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		presets : [
			{
				type : 'group::multi' ,
				title : `` ,
				preset_group_id : ``,
				is_sys_preset:true,
				multi_options : [],
			} ,
			{
				type : 'group::single' ,
				title : `` ,
				preset_group_id:'',
				single_options:[],
			} ,
			{
				type : 'plain::text' ,
				title : '',
				plain_prompt_id:'',
				contents : [{
					type : 'text',
					text : '',
				}] ,
				
			} ,
		] satisfies PromptGroup[] as PromptGroup[] ,
	} );
	
	createQuickPromptTable();
	
	
	const {} = rehance_QuickPrompts_SQLIO( {
		store ,
		setState ,
		mutate,
	} )();
	
	const {} = rehance_QuickPromptPresets( {
		store ,
		setState ,
		mutate,
	} )();
	
	const rtn = {};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );


function satisfiesAs<T>(value:T) {
	return value;
}

export type PromptGroup = 
	|QuickPrompt.PresetPromptGroup.Group.SingleGroup
	|QuickPrompt.PresetPromptGroup.Group.MultiGroup
	|QuickPrompt.PresetPromptGroup.Plain.PlainPrompt;

export type ReaxelQuickPrompts = Pick<typeof reaxel_QuickPrompts , "mutate" | "store" | "setState">;


import { createQuickPromptTable } from "#main/services/DB/QuickPrompts/create-table.db";
import { rehance_QuickPromptPresets } from "#main/reaxels/quick-prompts/system-presets";
import type { QuickPrompt } from '#src/types/QuickPrompt';
import { rehance_QuickPrompts_SQLIO } from "#main/reaxels/quick-prompts/sqlite-IO";
