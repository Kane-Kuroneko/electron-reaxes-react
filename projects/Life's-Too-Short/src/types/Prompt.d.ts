export type Prompt = {
	role: "system" | "user" | "assistant" | "function" | (string & {});  // 支持扩展角色
	content: string | null;
	name?: string;                   // 仅用于function role等辅助字段
	function_call?: {
		name: string;
		arguments: string;           // JSON string
	};
	tool_calls?: Array<{
		id: string;
		type: "function";
		function: {
			name: string;
			arguments: string;       // JSON string
		};
	}>;
	// 如果需要支持多模态
	images?: Array<Blob | string>; // base64 或 URL
	files?: Array<File>;           // 前端上传文件场景
	metadata?: Record<string, any>; // 自定义扩展字段
};
