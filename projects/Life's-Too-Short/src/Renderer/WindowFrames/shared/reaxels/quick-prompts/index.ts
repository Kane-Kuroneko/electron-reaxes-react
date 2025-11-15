export const reaxel_QuickPrompts = reaxel(() => {
	
	const {store,setState,mutate} = createReaxable({
		presets,
		
	})
	
	const rtn = {
		modifyPreset(preset_prompt_id:string,newPreset:{title?:string,content?:string}){
			mutate(s => {
				const target = s.presets.find(p => p.id === preset_prompt_id);
				if(target){
					if(newPreset.title !== undefined) target.title = newPreset.title;
					if(newPreset.content !== undefined) target.content = newPreset.content;
				}
			});
		},
		deletePreset(preset_prompt_id:string){
			mutate(s => {
				s.presets = s.presets.filter(p => p.id !== preset_prompt_id);
			});
		}
	}
	
	return Object.assign(() => rtn , {
		store,
		setState,
		mutate
	})
})


import presets from './preset-prompts.json';
