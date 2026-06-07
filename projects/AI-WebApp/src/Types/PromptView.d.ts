export namespace PromptView {
	export type Side = 'left' | 'right';
	
	export type Item = {
		id: string;
		content: string;
		createdAt: number;
		updatedAt: number;
	};
	
	export type Appearance = {
		theme: 'light' | 'dark';
		themeSource: 'light' | 'dark' | 'system';
	};
	
	export type State = {
		side: Side;
		items: Item[];
		appearance: Appearance;
	};
	
	export type SaveResult = {
		success: boolean;
		items: Item[];
		error?: string;
	};
	
	export type CopyResult = {
		success: boolean;
		error?: string;
	};
}
