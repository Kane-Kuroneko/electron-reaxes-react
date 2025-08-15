export type Author = Author.User | Author.LLM | Author.System;

export namespace Author {
	export type User = {
		type: 'user';
		user_id: string;
		name?: string;
	};
	
	export type LLM = {
		type: 'llm';
		model: string;
	};
	
	export type System = {
		type: 'system';
		desc?: string;
	};
}
