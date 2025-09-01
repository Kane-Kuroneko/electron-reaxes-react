const buildPrompt = () => `
你是一个对话意图分流器，请严格输出 JSON。
{
   "summary": string,   // 简洁标题，≤15字
   "complex": number,   // 1~5
   "confidence": number, // 0~1
   "intent": string,    // 预定义标签，如 weather_query, tech_support, chit_chat
   "topics": string[]   // 可能涉及的多个主题
}
示例：
用户输入: "今天天气如何？"
输出: {"summary":"天气查询","complex":1,"confidence":0.95,"intent":"weather_query","topics":["天气"]}
`;
const buildResponseFormat = () => ({
	type: 'json_schema',
	json_schema: {
		name: 'intent_router_response',
		strict: true,  // 启用严格模式，确保输出精确匹配
		schema: {
			type: 'object',
			properties: {
				summary: { type: 'string', description: '简洁标题，≤15字' },
				complex: { type: 'integer', minimum: 1, maximum: 5 },
				confidence: { type: 'number', minimum: 0, maximum: 1 },
				intent: { type: 'string', description: '预定义标签' },
				topics: { type: 'array', items: { type: 'string' } },
			},
			required: ['summary', 'complex', 'confidence', 'intent', 'topics'],
			additionalProperties: false,
		},
	},
});
export const llmRouter = async({userInput}:LLMRouterParams) => {
	const prompt = buildPrompt();
	
	return LLMRqster.openai.chat<OpenAIResponse>( {
		model : 'gpt-5-nano' ,
		input : [
			{
				content : prompt ,
				role : 'system' ,
				// message_id:''
			} ,
			{
				content : userInput ,
				role : 'user',
			},
		] ,
		stream : false ,
		response_format:buildResponseFormat(),
	} ).then((s) => {
		const resultText = s.output.find((it) => it.type === 'message').content.find(it => it.type==='output_text').text;
		return JSON.parse(resultText) as UserInputSummary;
	})
};
export type UserInputSummary = {
	"summary": string,   // 简洁标题，≤15字
	"complex": number,   // 1~5
	"confidence": number, // 0~1
	"intent": string,    // 预定义标签，如 weather_query, tech_support, chit_chat
	"topics": string[]   // 可能涉及的多个主题
}
export type LLMRouterParams = {
	userInput : string;
}
import { LLMRqster } from "#main/services/LLM-requester";
import { OpenAIResponse } from "#main/types/openai/Response";
