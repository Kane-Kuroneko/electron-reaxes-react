/**
 * 请求OpenAI接口需要用代理
 */
export const useAgentRequest= async (url: URL | RequestInfo, init?: RequestInit):Promise<Response> => {
	return fetch(
		url,
		{
			...init,
			agent : new HttpsProxyAgent('http://127.0.0.1:8888'),
		}
	)
}


import fetch , {RequestInfo , RequestInit,Response} from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent';
