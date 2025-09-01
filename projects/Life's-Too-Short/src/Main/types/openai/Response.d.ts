export interface OpenAIResponse {
	id: string
	object: "response"
	created_at: number
	status: "completed" | "in_progress" | "failed"
	background: boolean
	error: OpenAIResponseError | null
	incomplete_details?: Record<string, unknown> | null
	instructions?: string | null
	max_output_tokens?: number | null
	max_tool_calls?: number | null
	model: string
	output: ResponseOutput[]
	parallel_tool_calls?: boolean
	previous_response_id?: string | null
	prompt_cache_key?: string | null
	reasoning?: {
		effort?: "low" | "medium" | "high"
		summary?: string | null
	} | null
	safety_identifier?: string | null
	service_tier?: "default" | "premium"
	store?: boolean
	temperature?: number
	text?: {
		format: {
			type: "text" | "json" | "html"
		}
		verbosity?: "low" | "medium" | "high"
	}
	tool_choice?: "auto" | string
	tools: Array<unknown>
	top_logprobs?: number
	top_p?: number
	truncation?: "disabled" | "enabled"
	usage?: TokenUsage
	user?: string | null
	metadata?: Record<string, unknown>
}

export interface OpenAIResponseError {
	code?: string
	message?: string
	param?: string | null
	type?: string
}

export interface TokenUsage {
	input_tokens: number
	input_tokens_details?: {
		cached_tokens: number
	}
	output_tokens: number
	output_tokens_details?: {
		reasoning_tokens?: number
	}
	total_tokens: number
}

/* ----------------- discriminated union ----------------- */
export type ResponseOutput =
	| ReasoningOutput
	| MessageOutput
	| ToolOutput // 保留扩展可能性

export interface ReasoningOutput {
	id: string
	type: "reasoning"
	summary: string[]
}

export interface MessageOutput {
	id: string
	type: "message"
	status: "completed" | "in_progress" | "failed"
	role: "assistant" | "user" | "system"
	content: OutputContent[]
}

export interface ToolOutput {
	id: string
	type: "tool"
	name?: string
	status?: "completed" | "in_progress" | "failed"
	result?: unknown
}

/* ----------------- content ----------------- */
export interface OutputContent {
	type: "output_text" | string
	annotations: unknown[]
	logprobs: unknown[]
	text: string
}
