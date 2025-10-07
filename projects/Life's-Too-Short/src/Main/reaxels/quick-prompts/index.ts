/**
 * 
 */
import { wssOn } from "#main/services/wss-messager";

export const reaxel_QuickPrompts = reaxel(() => {
	
	const {store,setState,mutate} = createReaxable({
		
	})
	
	wssOn('quick-prompt::update',() => {
		
	})
	
	wssOn('quick-prompts-presets::get',(data) => {
		
	})
	
	const rtn = {};
	
	return Object.assign(() => rtn , {
		
	})
})
