export namespace OpenAI {
	
	export type Message = {
		role: 'user' | 'asssitant' | 'system';
		content: string[]|string;
		
	}
	
	export type Model =
		| 'gpt-4'
		| 'gpt-4o'
		| 'gpt-4o-mini'
		| 'gpt-4o-mini-0613'
		| 'gpt-4o-mini-32k'
		| 'gpt-4o-mini-32k-0613'
		| 'gpt-4o-32k'
		| 'gpt-4o-32k-0613'
		| 'gpt-3.5-turbo'
		| 'gpt-3.5-turbo-0613'
		| 'gpt-3.5-turbo-16k'
		| 'gpt-3.5-turbo-16k-0613'
		| 'gpt-3.5-turbo-0301'
		| 'gpt-4-0613'
		| 'gpt-4-32k'
		| 'gpt-4-32k-0613'
		| 'gpt-5-nano';
	
}
