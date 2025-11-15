
export const rehance_QuickPromptPresets = ({store,setState,mutate}:ReaxelQuickPrompts) => () => {
	
	console.log(2);
	insertQuickPrompts();
	
	wssOn('quick-prompt::update',() => {
		
	})
	
	wssOn('quick-prompts-presets::get',(data) => {
		
	})
	
	return {
		
	}
}
import { insertQuickPrompts } from "#main/services/DB/QuickPrompts/insert-presets.db";

import { wssOn } from "#main/services/wss-messager";
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

type ReaxelQuickPrompts = Pick<typeof import('../').reaxel_QuickPrompts , "mutate" | "store" | "setState">;
