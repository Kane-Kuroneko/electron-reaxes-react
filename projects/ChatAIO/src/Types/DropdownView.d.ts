export namespace DropdownView {
	export type Command =
		| {
			type : 'show';
			items : import('./MenuView').MenuView.Item[];
			theme : 'light' | 'dark';
			focusedIndex : number;
		}
		| { type : 'hide' }
		| { type : 'focus-item'; index : number }
		| { type : 'theme-update'; theme : 'light' | 'dark' };
}
