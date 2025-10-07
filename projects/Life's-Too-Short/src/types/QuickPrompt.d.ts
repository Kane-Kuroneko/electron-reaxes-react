export namespace QuickPrompt {
	/**
	 * 一组QuickPrompt包含了几个预设风格,每个风格下有多个可选项
	 */
	export type QuickPromptGroup = {
		group_id : string;
		group_name : string;
		radio_options : {
			label : string;
			prompt_opt_id : string;
			desc?:string;
			content : string;
		}[];
	}
	
	export type QuickPromptItem = {
		quick_prompt_id: string; // UUID
		title: string; // 显示名称，e.g., "英文语法练习"，用于 UI 列表
		description?: string; // 可选描述，解释用途
		enabled: boolean; // 开关状态，默认 false，用户在 UI 中 toggle
		prompts: Array<{ // 数组，支持多条提示词
			role: Role; // 'system' | 'user' | 'assistant'，复用现有 Role 类型
			content: string; // 提示词文本，支持简单字符串或复杂内容
			metadata?: Record<string, any>; // 可选元数据，e.g., { priority: 1 } 用于排序
		}>;
		is_preset: boolean; // 是否系统预设（true 为预设，不可删除；false 为用户自定义）
		created_at?: number; // 创建时间戳
		updated_at?: number; // 更新时间戳
	}
}


import { Role } from '#src/types/Role';
