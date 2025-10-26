
const groupid = (uuid:string) => `preset_group_id-${uuid}`;
const plainid = (uuid:string) => `plain_prompt_id-${uuid}`;
const optionid = {
	single(uuid:string){
		return `preset_single_option_id-${uuid}`
	},
	multi(uuid:string){
		return `preset_multi_option_id-${uuid}`
	},
};


const preset_prompts_groups:( QuickPrompt.PresetPromptGroup.Group.MultiGroup | QuickPrompt.PresetPromptGroup.Group.SingleGroup | QuickPrompt.PresetPromptGroup.Plain.PlainPrompt )[] = [
	checkAs<QuickPrompt.PresetPromptGroup.Group.MultiGroup>( {
		type : 'group::multi' ,
		title : `专家` ,
		preset_group_id : groupid( `a6adf21a-3bdc-44cd-8443-baa40699a445` ) ,
		is_sys_preset : true ,
		desc : '智能专家，提供各种领域的知识和建议',
		multi_options : [
			optionid.single('0fee3a58-2080-4318-908a-a5b09e10a4ce'),
			optionid.single('e4f90218-7ab1-450d-a82d-6e55e465acde'),
			
		] ,
	} ) ,
	checkAs<QuickPrompt.PresetPromptGroup.Group.SingleGroup>( {
		type : 'group::single' ,
		title : `扮演mbti人格` ,
		preset_group_id : groupid( `8015fe6a-fdfd-4e3d-815a-e640128bb2e8` ) ,
		is_sys_preset : true ,
		single_options : [
			optionid.single('d7cfab1d-8fb7-402b-b383-78395fac8c49'),
			optionid.single('56772ca5-55fb-4f41-adea-a5c8617c3210')
		] ,
	} ) ,
	checkAs<QuickPrompt.PresetPromptGroup.Group.SingleGroup>({
		type : 'group::single' ,
		title : `感性<->理性` ,
		preset_group_id : groupid( `8f9b9368-d13a-4fb9-9e04-697b4af65f28` ) ,
		is_sys_preset : true ,
		single_options : [
			optionid.single( 'c770290a-ce53-4d35-8531-fd2a1fa6bdea' ) ,
			optionid.single( '00c3d4cc-f4d1-4362-93f2-7e9ac409358b' ) ,
		] ,
	}) ,
	checkAs<QuickPrompt.PresetPromptGroup.Group.SingleGroup>({
		type : 'group::single' ,
		title : `response language` ,
		preset_group_id : groupid('5ed879f5-a19f-40d8-a8b8-4856f3a48667') ,
		single_options : [
			optionid.single('88988fe3-9a7d-44a5-976b-f936b74ac795'),
			optionid.single('ff0bda66-9c5b-4065-a639-6aaad0147fcf'),
		] ,
	}) ,
	checkAs<QuickPrompt.PresetPromptGroup.Plain.PlainPrompt>({
		type : 'plain::text' ,
		title : '' ,
		plain_prompt_id : plainid('d852a831-026e-4a5e-b219-d83bece6f6e4') ,
		contents : [
			{
				type : 'text' ,
				text : '' ,
			},
		] ,
	}) ,
];

const preset_prompt_options:(QuickPrompt.Option.SingleOption|QuickPrompt.Option.MultiOption)[] = [
	//专家选项
	checkAs<QuickPrompt.Option.MultiOption>({
		quick_prompt_multi_option_id : optionid.multi('0fee3a58-2080-4318-908a-a5b09e10a4ce'),
		fk_quick_prompt_group_id : groupid('a6adf21a-3bdc-44cd-8443-baa40699a445') ,
		title : '翻译专家',
		contents : [
			{
				type : 'text',
				text : '你需要扮演翻译专家，提供准确的翻译服务',
			}
		],
		desc : '',
		showcase:'',
		disabled:false,
	}),
	checkAs<QuickPrompt.Option.MultiOption>({
		quick_prompt_multi_option_id : optionid.multi( 'e4f90218-7ab1-450d-a82d-6e55e465acde'),
		fk_quick_prompt_group_id : groupid('a6adf21a-3bdc-44cd-8443-baa40699a445') ,
		title : 'Typescript编程专家',
		contents : [
			{
				type : 'text',
				text : '你需要扮演Typescript编程专家，提供准确的Typescript编程服务',
			}
		],
		desc : '',
		showcase:'',
		disabled:false,
	}),
	//mbti选项
	checkAs<QuickPrompt.Option.SingleOption>({
		quick_prompt_single_option_id : optionid.single('d7cfab1d-8fb7-402b-b383-78395fac8c49'),
		fk_quick_prompt_group_id : groupid( '8015fe6a-fdfd-4e3d-815a-e640128bb2e8' ) ,
		title : 'mbti:infp-T',
		contents : [
			{
				type : 'text',
				text : '你需要扮演infp-T人格,并且在回答中体现出这种人格的特点',
			}
		],
		desc : '',
		showcase:'',
		disabled:false,
	}),
	checkAs<QuickPrompt.Option.SingleOption>({
		quick_prompt_single_option_id : optionid.single('56772ca5-55fb-4f41-adea-a5c8617c3210'),
		fk_quick_prompt_group_id : groupid( '8015fe6a-fdfd-4e3d-815a-e640128bb2e8' ) ,
		title : 'mbti:intj-A',
		contents : [
			{
				type : 'text',
				text : '你需要扮演intj-A人格,并且在回答中体现出这种人格的特点',
			}
		],
		desc : '',
		showcase:'',
		disabled:false,
	}),
	//情感特征选项
	checkAs<QuickPrompt.Option.SingleOption>({
		quick_prompt_single_option_id : optionid.single( 'c770290a-ce53-4d35-8531-fd2a1fa6bdea' ) ,
		fk_quick_prompt_group_id : groupid( '8f9b9368-d13a-4fb9-9e04-697b4af65f28' ) ,
		title : '理性' ,
		contents : [
			{
				type : 'text' ,
				text : '保持理性回答问题' ,
			}
		] ,
		desc : '' ,
		showcase : '' ,
		disabled : false ,
	}),
	checkAs<QuickPrompt.Option.SingleOption>({
		quick_prompt_single_option_id : optionid.single('00c3d4cc-f4d1-4362-93f2-7e9ac409358b'),
		fk_quick_prompt_group_id : groupid( '8f9b9368-d13a-4fb9-9e04-697b4af65f28' ) ,
		title : '感性',
		contents : [
			{
				type : 'text',
				text : '感性回答问题',
			}
		],
		desc : '',
		showcase:'',
		disabled:false,
	}),
	//语言选项
	checkAs<QuickPrompt.Option.SingleOption>({
		quick_prompt_single_option_id : optionid.single('88988fe3-9a7d-44a5-976b-f936b74ac795'),
		fk_quick_prompt_group_id : groupid('5ed879f5-a19f-40d8-a8b8-4856f3a48667') ,
		title : 'response language',
		contents : [
			{
				type : 'text',
				text : '你需要以中文回答问题',
			}
		],
		desc : '',
		showcase:'',
		disabled:false,
	}),
	checkAs<QuickPrompt.Option.SingleOption>({
		quick_prompt_single_option_id : optionid.single('ff0bda66-9c5b-4065-a639-6aaad0147fcf'),
		fk_quick_prompt_group_id : groupid('5ed879f5-a19f-40d8-a8b8-4856f3a48667') ,
		title : 'response language',
		contents : [
			{
				type : 'text',
				text : '你需要以英文回答问题',
			}
		],
		desc : '',
		showcase:'',
		disabled:false,
	}),
]


export const insertQuickPrompts = async () => {
	
	
	const groupsToDB = () => {
		return preset_prompts_groups.filter( it => it.type !== 'plain::text' ).map( ( it ): InferInsertModel<typeof quickPromptGroups> => {
			return {
				quick_prompt_group_id : it.preset_group_id ,
				title : it.title ,
				type : it.type ,
				is_sys_preset : it.is_sys_preset ,
				created_at : Date.now() ,
				updated_at : Date.now() ,
			};
		} );
	}
	
	const singleOptionToDB = () => {
		return preset_prompt_options.filter( it => it.hasOwnProperty( 'quick_prompt_single_option_id' ) ).map( ( it: QuickPrompt.Option.SingleOption ): InferInsertModel<typeof singleOptions> => {
			return {
				quick_prompt_single_option_id : it.quick_prompt_single_option_id ,
				fk_quick_prompt_group_id : it.fk_quick_prompt_group_id ,
				title : it.title ,
				contents : JSON.stringify( it.contents ) ,
				desc : it.desc || '' ,
				disabled : it.disabled ,
				showcase : it.showcase || '' ,
			};
		} );
	}
	
	const multiOptionToDB = () => {
		return preset_prompt_options.filter( it => it.hasOwnProperty( 'quick_prompt_multi_option_id' ) ).map( ( it: QuickPrompt.Option.MultiOption ): InferInsertModel<typeof multiOptions> => {
			return {
				quick_prompt_multi_option_id : it.quick_prompt_multi_option_id ,
				fk_quick_prompt_group_id : it.fk_quick_prompt_group_id ,
				title : it.title ,
				contents : JSON.stringify( it.contents ) ,
				desc : it.desc || '' ,
				disabled : it.disabled ,
				showcase : it.showcase || '' ,
			};
		} );
	}
	
	const plainPromptToDB = () => {
		return preset_prompts_groups.filter( it => it.type === 'plain::text' ).map( ( it ): InferInsertModel<typeof plainPrompts> => {
			return {
				plain_prompt_id : it.plain_prompt_id ,
				title : it.title ,
				contents : JSON.stringify( it.contents ) ,
				created_at : Date.now() ,
				updated_at : Date.now() ,
			};
		} );
	}
	
	
	// sqlite.exec(`
	// 	Insert into quick_prompt_groups (id, title, type, is_sys_preset, created_at, updated_at) values
	// 	${groupsToDB().map( g => `(
	// 		'${g.quick_prompt_group_id}',
	// 		'${g.title}',
	// 		'${g.type}',
	// 		${g.is_sys_preset ? 1 : 0},
	// 		${g.created_at},
	// 		${g.updated_at}
	// 	)` ).join( ',' )};
	//	
	// `)
	// return;
	db.transaction<any>((tx) => {
		
		const groupResult = tx.insert(quickPromptGroups).values(groupsToDB()).run();
		const singleResult = tx.insert(singleOptions).values(singleOptionToDB()).run();
		const multiResult = tx.insert(multiOptions).values(multiOptionToDB()).run();
		const plainResult = tx.insert(plainPrompts).values(plainPromptToDB()).run();
		
		return {
			groupResult,
			singleResult,
			multiResult,
			plainResult,
		};
	});
	
};

import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
	multiOptions ,
	plainPrompts ,
	quickPromptGroups ,
	singleOptions,
} from './schema';
import { type QuickPrompt } from "#src/types/QuickPrompt";
import { InferInsertModel } from 'drizzle-orm';
import { db,sqlite } from '../';
