export function createQuickPromptTable() {

	const createQuickPromptGroupsTable = () => `
		CREATE TABLE IF NOT EXISTS quick_prompt_groups (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			type TEXT NOT NULL DEFAULT 'group::single',
			is_sys_preset INTEGER DEFAULT 0,
			created_at INTEGER,
			updated_at INTEGER
		);
	`;

	const createMultiOptionsTable = () => `
		CREATE TABLE IF NOT EXISTS quick_prompt_multi_options (
			id TEXT PRIMARY KEY,
			fk_quick_prompt_group_id TEXT NOT NULL,
			title TEXT NOT NULL,
			contents TEXT,
			desc TEXT,
			disabled INTEGER DEFAULT 0,
			showcase TEXT,
			FOREIGN KEY (fk_quick_prompt_group_id) REFERENCES quick_prompt_groups(id)
		);
	`;

	const createSingleOptionsTable = () => `
		CREATE TABLE IF NOT EXISTS quick_prompt_single_options (
			id TEXT PRIMARY KEY,
			fk_quick_prompt_group_id TEXT NOT NULL,
			title TEXT NOT NULL,
			contents TEXT,
			desc TEXT,
			disabled INTEGER DEFAULT 0,
			showcase TEXT,
			FOREIGN KEY (fk_quick_prompt_group_id) REFERENCES quick_prompt_groups(id)
		);
	`;

	const createPlainPromptsTable = () => `
		CREATE TABLE IF NOT EXISTS plain_prompts (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			contents TEXT NOT NULL,
			created_at INTEGER,
			updated_at INTEGER
		);
	`;
	
	return [
		createQuickPromptGroupsTable() ,
		createMultiOptionsTable() ,
		createSingleOptionsTable() ,
		createPlainPromptsTable() ,
	].map( sql => sqlite.exec( sql ) );
}


import { sqlite } from "#main/services/DB";
