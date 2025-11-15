const dbPath = path.join(app.getPath('userData'), 'lts.db');
export const sqlite = new Database(dbPath,{ verbose: console.log });

const db = drizzle(sqlite, {
	schema: {
		quickPromptGroups,
		plainPrompts,
		multiOptions,
		singleOptions,
	}
});
export {db};

import {
	multiOptions ,
	plainPrompts ,
	quickPromptGroups ,
	singleOptions ,
} from '#main/services/DB/QuickPrompts/schema';
import { app } from 'electron';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
