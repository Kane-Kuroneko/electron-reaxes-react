export type Author = Author.User | Author.Assistant | Author.System;

export namespace Author {
	export type User = {
		role: 'user';
		user_id: string;
		metadata : {};
		name?: string;
	};
	
	export type Assistant = {
		role: 'assistant';
		model: string;
		metadata? : {};
	};
	
	export type System = {
		role: 'system';
		metadata : {};
		desc?: string;
	};
}
