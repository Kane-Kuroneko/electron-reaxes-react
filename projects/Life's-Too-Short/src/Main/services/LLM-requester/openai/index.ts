export const openai_rqst_opts = async <Stream extends boolean>({
	input,
	model = 'gpt-5-nano',
	stream ,
}: OpenAIRequestParams<Stream>) => {
	return {
		url: `https://api.openai.com/v1/responses`,
		init: {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `${OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				"model": model,
				"input": input,
				"stream": stream,
			}),
		} as RequestInit,
	};
};

export type OpenAIRequestParams<Stream extends boolean> = {
	model: OpenAI.Model,
	input: OpenAI.Message[];
	stream: Stream;
}



import { OPENAI_API_KEY } from '#project/.env.json';
import { OpenAI } from './type';
import fetch , {RequestInfo , RequestInit,Response} from 'node-fetch'
