const {} = createReaxable({
	
})

const createOpenAI = () => {
	type OpenAIRequestParamsBase = Omit<OpenAIRequestParams<any> , "stream">;
	
	interface OpenAIRequestParamsStreaming extends OpenAIRequestParamsBase {
		stream: true;
	}
	
	interface OpenAIRequestParamsNonStreaming extends OpenAIRequestParamsBase {
		stream: false;
	}
	
	async function chat<BodyType>(
		params: OpenAIRequestParamsNonStreaming
	): Promise<BodyType>;
	
	async function chat<BodyType>(
		params: OpenAIRequestParamsStreaming
	): Promise<ReadOpenAIStreamReturnType<BodyType>>;
	
	async function chat<BodyType>(
		{ stream, input, model }: OpenAIRequestParamsStreaming | OpenAIRequestParamsNonStreaming
	): Promise<ReadOpenAIStreamReturnType<BodyType> | BodyType> {
		const { url, init } = await openai_rqst_opts({
			model,
			stream,
			input,
		});
		
		const res = await useAgentRequest(url, init);
		
		if (stream) {
			return readOpenAIStream<BodyType>(res.body);
		} else {
			return (await res.json()) as BodyType;
		}
	}
	
	return {chat};
} 


export const LLMRqster = new class{
	
	constructor() {

	}
	openai = createOpenAI()
	
}


import { readOpenAIStream ,ReadOpenAIStreamReturnType} from '#main/services/LLM-requester/openai/streamReader';
import { openai_rqst_opts , OpenAIRequestParams  } from './openai';
import { useAgentRequest } from '#main/utils/useAgentRequest';
import { rexaStatus } from 'reaxes-toolkit';
import {} from 'reaxes-utils';
