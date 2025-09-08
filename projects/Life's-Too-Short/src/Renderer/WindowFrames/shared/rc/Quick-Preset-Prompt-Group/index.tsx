export const QuickPresetPromptGroup = reaxper( () => {
	
	const {
		deletePreset ,
		modifyPreset ,
	} = reaxel_QuickPrompts();
	
	
	return <div
		className={ less.quickPresetPromptGroup }
	>
		{ reaxel_QuickPrompts.store.presets.map( ( {
				id ,
				title ,
				content ,
			} ) =>
				<QuickPromptPreset
					key={ id }
					preset={ {
						preset_prompt_id : id ,
						title ,
						content ,
					} }
					onEdit={ ( preset ) => {
						modifyPreset( preset.preset_prompt_id , {
							content : preset.content ,
							title : preset.title ,
						} );
						// console.log( 'Edited preset:' , preset );
					} }
					onDelete={ ( preset_prompt_id ) => {
						deletePreset( preset_prompt_id );
					} }
				/> ,
		) }
	</div>;
} );

import { QuickPromptPreset } from "#renderer/WindowFrames/shared/rc/QuickPromptPreset";
import { reaxel_QuickPrompts } from "#renderer/WindowFrames/shared/reaxels/quick-prompts";
import { Button } from 'antd';
import less from './style.module.less';
