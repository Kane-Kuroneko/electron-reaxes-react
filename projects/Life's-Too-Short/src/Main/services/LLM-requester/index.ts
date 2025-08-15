const {} = createReaxable({
	
})


export const LLMRqster = new class{
	
	constructor() {
		
	}
	
	async openai({stream,input,model}:OpenAIRequestParams){
		const {
			url ,
			init,
		} = await openai_rqst_opts( {
			model ,
			stream ,
			input,
		} );
		return useAgentRequest( url , init ).then(res=>{
			return  readOpenAIStream( res.body );
		});
	}
}


import { readOpenAIStream } from '#main/services/LLM-requester/openai/streamReader';
import { openai_rqst_opts , OpenAIRequestParams  } from './openai';
import { useAgentRequest } from '#main/utils/useAgentRequest';
import { rexaStatus } from 'reaxes-toolkit';
import {} from 'reaxes-utils';
