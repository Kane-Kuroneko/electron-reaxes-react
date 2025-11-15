export namespace OpenAI {
	
	export type Message = {
		role: 'user' | 'assistant' | 'system';
		content: string[]|string;
		
	}
	
	
	
	export type Model =
		| 'gpt-4o'
		| 'gpt-4o-mini'
		| 'gpt-4.1'
		| 'gpt-4.1-mini'
		| 'gpt-3.5-turbo'
		| 'gpt-5-nano'
		| 'gpt-5';
}
