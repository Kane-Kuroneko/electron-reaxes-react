/**
 * @description 新建 / Clone AI 页的默认名（Add/Clone 弹窗当 placeholder，空着保存时写入）
 *
 * 重构后 label 不再带厂商名（厂商靠 logo 辨识），默认名直接从人名池取一个**全表未用过**的；
 * 池子用尽退回「供应商显示名 + 序号」（`ChatGPT 2`），这是唯一还会出现厂商名的兜底。
 * 老数据不迁移，已有 `ChatGPT-Anselm` 之类照旧显示。
 * 见 docs/features/ai-vendor-logo-identity.md
 */

export const AI_NAME_POOL = [
	'Anselm' ,
	'Leopold' ,
	'Florian' ,
	'Dietrich' ,
	'Ludwig' ,
	'Frieda' ,
	'Odette' ,
	'Colette' ,
	'Mireille' ,
	'Bastien' ,
	'Lucien' ,
	'Claudine' ,
	'Cosimo' ,
	'Ludovico' ,
	'Vittorio' ,
	'Marcello' ,
	'Fiorella' ,
	'Ginevra',
] as const;

/**
 * @param family 新页的 family（只用于池子耗尽时的兜底前缀）
 * @param existing 现有页实例（用 label 做去重）
 * @param excludeId 编辑态时排除自身
 */
export const buildDefaultAIName = (
	family:AI.AIFamily ,
	existing:ReadonlyArray<Pick<AI.AIItem , 'id' | 'label'>> ,
	excludeId?:string | null,
) => {
	const taken = existing
		.filter( ai => ai.id !== excludeId )
		.map( ai => ( ai.label || '' ).trim().toLowerCase() )
		.filter( Boolean );
	/* 老数据是 `ChatGPT-Anselm` 这种带前缀的，用 includes 兼容：只要名字被占过就跳 */
	const free = AI_NAME_POOL.find( name => {
		const lower = name.toLowerCase();
		return !taken.some( label => label.includes( lower ) );
	} );
	if( free ) {
		return free;
	}
	const prefix = AIFamilyDisplayName[family] || family;
	let index = 2;
	while( taken.includes( `${ prefix } ${ index }`.toLowerCase() ) ) {
		index++;
	}
	return `${ prefix } ${ index }`;
};

import { AIFamilyDisplayName } from '#shared/statics/AI-family';
import type { AI } from '#src/Types/SettingsTypes/AI';
