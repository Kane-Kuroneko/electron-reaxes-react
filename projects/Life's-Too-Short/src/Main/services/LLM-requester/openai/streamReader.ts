
export function readOpenAIStream(
	stream: ReadableLike,
	options: ReaderOptions = {}
): ReadOpenAIStreamReturnType {
	const { chunkSize = 1024, stopOnDone = true } = options;
	
	const { store, setState, mutate } = createReaxable({
		content: [] as string[],
		events: [] as any[],  // 新增: 存储每个 parsed 事件对象，用于提取外层信息如 response.id 等
		root: null as ResponseObject,  // 新增: 存储根结构，初始为 null，当首个带有 id 的 parsed 出现时设置
	});
	
	const done = xPromise<{ content: string[], events: any[], root: any }>()
	
	// 内部状态
	let isRunning = false;
	let leftover = ''; // 用于跨 chunk 拼接不完整的 SSE 事件
	let textDecoder = new TextDecoder();
	
	async function attach(streamIn: ReadableLike | undefined) {
		if (isRunning) return;
		if (!streamIn) {
			// 没有流，直接把done置为已完成（空流场景）
			done.resolve({ content: store.content, events: store.events, root: store.root })
			return;
		}
		
		isRunning = true;
		
		try {
			for await (const rawChunk of streamIn as AsyncIterable<Buffer | string>) {
				
				// 兼容 chunk 为 string 或 Buffer
				const bufferChunk = typeof rawChunk === 'string' ? Buffer.from(rawChunk) : rawChunk;
				const text = textDecoder.decode(bufferChunk, { stream: true });
				
				leftover += text;
				
				// 将可完整分割的 SSE 事件拿出来，保留最后不完整的一段到 leftover
				const parts = leftover.split(/\r?\n\r?\n/);
				if (!leftover.endsWith('\n\n') && !leftover.endsWith('\r\n\r\n')) {
					leftover = parts.pop() || '';
				} else {
					leftover = '';
				}
				
				for (const part of parts) {
					// 每个 part 可能包含多行（多条 data:），逐行处理
					const lines = part.split(/\r?\n/);
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;
						if (!trimmed.startsWith('data:')) continue;
						const data = trimmed.slice(5).trim();
						
						if (stopOnDone && data === '[DONE]') {
							// 流正常结束
							isRunning = false;
							// 如果 leftover 有内容也尝试推入
							if (leftover.length > 0) {
								pushBuffer(leftover);
								leftover = '';
							}
							done.resolve({ content: store.content, events: store.events, root: store.root })
							return;
						}
						
						// 尝试解析 JSON 并提取 content（兼容 chat/completions 和 responses）
						let parsed: OpenAIStreamChunk = null;
						try {
							parsed = JSON.parse(data);
						} catch(e) {
							// 非 JSON 内容忽略
							// console.error();
						}
						
						// 在解析循环中，推送 parsed 对象到 events
						if (parsed) {
							mutate(s => {
								s.events.push(parsed);  // 推送完整 parsed 对象
								// 如果 root 未设置且 parsed 有 id，则设置 root 为该 parsed
								if (parsed.type === "response.completed") {
									s.root = parsed.response;
								}
							});
							
							// 尝试提取多种可能的字段位置 (candidates 保持之前建议的扩展)
							const candidates: (string | undefined)[] = [
								// chat/completions style delta
								parsed.choices?.[0]?.delta?.content,
								// chat/completions full text
								parsed.choices?.[0]?.text,
								// responses/newer format
								parsed.output?.[0]?.content?.[0]?.text,
								// 任意 fallback: aggregated content 字段
								parsed.content,
								// 新增 Responses API 支持
								parsed.delta,
								parsed.delta?.text,
							];
							
							for (const seg of candidates) {
								if (typeof seg === 'string' && seg.length > 0) {
									pushBuffer(seg);
								}
							}
						}
					}
				}
			}
			
			// 流结束，推送剩余缓冲并 resolve
			if (leftover.length > 0) {
				pushBuffer(leftover);
				leftover = '';
			}
			done.resolve({ content: store.content, events: store.events, root: store.root })
		} catch (err) {
			done.reject(err);
		} finally {
			isRunning = false;
		}
	}
	
	// 将字符串按 chunkSize 拆分并通过 mutate 推入响应式数组
	function pushBuffer(s: string) {
		if (s.length === 0) return;
		let rem = s;
		while (rem.length >= chunkSize) {
			const part = rem.slice(0, chunkSize);
			rem = rem.slice(chunkSize);
			// 使用用户库提供的 mutate 写入（假定 mutate 回调参数为数组本身）
			mutate(s => {
				s.content.push(part);
			});
		}
		if (rem.length > 0) {
			mutate(s => {
				s.content.push(rem);
			});
		}
	}
	
	// 如果调用时传入了 stream，则立即开始
	if (stream) {
		// 不 await，立即返回 content 与 done
		void attach(stream);
	}
	
	return {
		content: store.content,
		events: store.events,  // 新增返回 events 响应式数组
		done,
	} as const;
}

export type ReadOpenAIStreamReturnType = {
	content: string[];
	events: any;
	done: XPromise<{content: string[]; events: any[]; root: any}>
}


interface BaseStreamChunk {
   type: string;
   sequence_number: number;
}

interface ResponseObject {
   id: string;
   object: "response";
   created_at: number;
   status: "in_progress" | "completed";
   background: boolean;
   error: null;
   incomplete_details: null;
   instructions: null;
   max_output_tokens: null;
   max_tool_calls: null;
   model: string;
   output: OutputItem[];
   parallel_tool_calls: boolean;
   previous_response_id: null;
   prompt_cache_key: null;
   reasoning: {
      effort: string;
      summary: null;
   };
   safety_identifier: null;
   service_tier: string;
   store: boolean;
   temperature: number;
   text: {
      format: {
         type: string;
      };
      verbosity: string;
   };
   tool_choice: string;
   tools: any[];
   top_logprobs: number;
   top_p: number;
   truncation: string;
   usage: Usage | null;
   user: null;
   metadata: Record<string, any>;
}

interface Usage {
   input_tokens: number;
   input_tokens_details: {
      cached_tokens: number;
   };
   output_tokens: number;
   output_tokens_details: {
      reasoning_tokens: number;
   };
   total_tokens: number;
}

interface OutputItem {
   id: string;
   type: "reasoning" | "message";
   summary?: any[];  // For reasoning
   status?: "in_progress" | "completed";  // For message
   content?: ContentPart[];  // For message
   role?: "assistant";  // For message
}

interface ContentPart {
   type: "output_text";
   annotations: any[];
   logprobs: any[];
   text: string;
}

interface ResponseCreatedChunk extends BaseStreamChunk {
   type: "response.created";
   response: ResponseObject;
}

interface ResponseInProgressChunk extends BaseStreamChunk {
   type: "response.in_progress";
   response: ResponseObject;
}

interface ResponseOutputItemAddedChunk extends BaseStreamChunk {
   type: "response.output_item.added";
   output_index: number;
   item: OutputItem;
}

interface ResponseOutputItemDoneChunk extends BaseStreamChunk {
   type: "response.output_item.done";
   output_index: number;
   item: OutputItem;
}

interface ResponseContentPartAddedChunk extends BaseStreamChunk {
   type: "response.content_part.added";
   item_id: string;
   output_index: number;
   content_index: number;
   part: ContentPart;
}

interface ResponseOutputTextDeltaChunk extends BaseStreamChunk {
   type: "response.output_text.delta";
   item_id: string;
   output_index: number;
   content_index: number;
   delta: string;
   logprobs: any[];
   obfuscation: string;
}

interface ResponseOutputTextDoneChunk extends BaseStreamChunk {
   type: "response.output_text.done";
   item_id: string;
   output_index: number;
   content_index: number;
   text: string;
   logprobs: any[];
}

interface ResponseContentPartDoneChunk extends BaseStreamChunk {
   type: "response.content_part.done";
   item_id: string;
   output_index: number;
   content_index: number;
   part: ContentPart;
}

interface ResponseCompletedChunk extends BaseStreamChunk {
   type: "response.completed";
   response: ResponseObject;
}

type OpenAIStreamChunk =
   | ResponseCreatedChunk
   | ResponseInProgressChunk
   | ResponseOutputItemAddedChunk
   | ResponseOutputItemDoneChunk
   | ResponseContentPartAddedChunk
   | ResponseOutputTextDeltaChunk
   | ResponseOutputTextDoneChunk
   | ResponseContentPartDoneChunk
   | ResponseCompletedChunk;

type ReadableLike = NodeJS.ReadableStream | AsyncIterable<Buffer | string>;

interface ReaderOptions {
	/**
	 * 单个分片最大字符数，超过即推入 content 新元素
	 */
	chunkSize?: number;
	/**
	 * 是否在遇到 [DONE] 时自动结束
	 */
	stopOnDone?: boolean;
}

import { xPromise , XPromise } from 'reaxes-utils';
