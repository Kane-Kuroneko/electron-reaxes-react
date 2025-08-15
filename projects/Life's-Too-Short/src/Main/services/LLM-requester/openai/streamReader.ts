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

export function readOpenAIStream(
	stream: ReadableLike,
	options: ReaderOptions = {}
) {
	const { chunkSize = 1024, stopOnDone = true } = options;
	
	const { store, setState, mutate } = createReaxable({
		content: [] as string[],
		events: [] as any[],  // 新增: 存储每个 parsed 事件对象，用于提取外层信息如 response.id 等
	});
	
	const done = xPromise<{ content: string[], events: any[] }>()
	
	// 内部状态
	let isRunning = false;
	let leftover = ''; // 用于跨 chunk 拼接不完整的 SSE 事件
	let textDecoder = new TextDecoder();
	
	async function attach(streamIn: ReadableLike | undefined) {
		if (isRunning) return;
		if (!streamIn) {
			// 没有流，直接把done置为已完成（空流场景）
			done.resolve({ content: store.content, events: store.events })
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
							done.resolve({ content: store.content, events: store.events })
							return;
						}
						
						// 尝试解析 JSON 并提取 content（兼容 chat/completions 和 responses）
						let parsed: any = null;
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
			done.resolve({ content: store.content, events: store.events })
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


import { xPromise } from 'reaxes-utils';
