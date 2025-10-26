export const quickPromptGroups = sqliteTable('quick_prompt_groups', {
	//quick_prompt_group_id
	quick_prompt_group_id: text('id').primaryKey(),
	title: text('title').notNull(),
	type: text('type',{enum:['group::multi','group::single']}).notNull().default('group::single'), // 'group::multi' or 'group::single'
	is_sys_preset: integer('is_sys_preset', { mode: 'boolean' }).default(false),
	created_at: integer('created_at'),
	updated_at: integer('updated_at')
});

export const multiOptions = sqliteTable( 'quick_prompt_multi_options' , {
	quick_prompt_multi_option_id : text( 'id' ).primaryKey() ,
	// 外键列，对应 quickPromptGroups.quick_prompt_group_id
	fk_quick_prompt_group_id :
		text( 'fk_quick_prompt_group_id' ).
		references( () => quickPromptGroups.quick_prompt_group_id ).
		notNull() ,
	title : text( 'title' ).notNull() ,
	// JSON string of Message.MessageContent[]
	contents : text( 'contents' ) ,
	desc : text( 'desc' ) ,
	disabled : integer( 'disabled' , { mode : 'boolean' } ).default( false ) ,
	showcase : text( 'showcase' ) ,
} );

export const singleOptions = sqliteTable( 'quick_prompt_single_options' , {
	// quick_prompt_single_option_id
	quick_prompt_single_option_id : text( 'id' ).primaryKey() ,
	fk_quick_prompt_group_id :
		text( 'fk_quick_prompt_group_id' ).
		references( () => quickPromptGroups.quick_prompt_group_id ).
		notNull() ,
	title : text( 'title' ).notNull() ,
	// JSON string of Message.MessageContent[]
	contents : text( 'contents' ) ,
	desc : text( 'desc' ) ,
	disabled : integer( 'disabled' , { mode : 'boolean' } ).default( false ) ,
	showcase : text( 'showcase' ) ,
} );

export const plainPrompts = sqliteTable( 'plain_prompts' , {
	//plain_prompt_id
	plain_prompt_id : text( 'id' ).primaryKey() ,
	title : text( 'title' ).notNull() ,
	contents : text( 'contents' ).notNull() , // JSON string of Message.MessageContent[]
	created_at : integer( 'created_at' ) ,
	updated_at : integer( 'updated_at' ) ,
} );

export type QuickPromptSchema = {
	QuickPromptGroups: typeof quickPromptGroups;
	MultiOptions: typeof multiOptions;
	SingleOptions: typeof singleOptions;
	PlainPrompts: typeof plainPrompts;
}

import {
	integer ,
	sqliteTable ,
	text ,
} from 'drizzle-orm/sqlite-core';

