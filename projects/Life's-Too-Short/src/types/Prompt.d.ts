export type PresetPrompt = {
	type : 'text',
	text : string;
	prompt_id : string;
} & Metadata;


export type InheritedPrompt = {
	type : 'extend_from_channel',
	channel_id : string;
};

export type TextPrompt = {
	type : 'text',
	text : string;
}

export type PromptTemplate = {
	type : 'text';
	text : string;
}|{
	prompt_template_id : string;
	type : 'text.preset',
	text : string;
};

export type Prompt = (InheritedPrompt|PresetPrompt|TextPrompt) & Metadata;


import type { Metadata } from './Metadata';
