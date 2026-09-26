/**
 * 左侧 Prompt：慢速写一条、侧栏开着连切三次、Copy 后贴进当前 AI 输入框。
 * 未登录时用通用可见输入探测（避开邮箱/密码），写入走 insertText。
 * 打开侧栏 / Copy 之后不要再空等；切页用 waitFor 占用 afterSwitch 预算。
 * 设计：docs/features/playwright-demo-script.md
 */

export const DEMO_PROMPT_TEXT = 'Compare the last three answers. List agreements, contradictions, and one question to ask next.';

export const runPromptScene = async( ctx:DemoContext ) => {
	await waitForMainShell( ctx.electronApp );
	const prompt = await demoOpenLeftPrompt( ctx );

	const composer = prompt.locator( 'textarea.prompt-card-textarea' ).first();
	if( await composer.count() === 0 ) {
		await demoClick( prompt.getByRole( 'button' , { name : 'New Prompt' } ) , ctx.pace );
	}
	await demoFillSlow(
		prompt.locator( 'textarea.prompt-card-textarea' ).first() ,
		DEMO_PROMPT_TEXT ,
		ctx.pace,
	);
	await beat( ctx.pace.afterPageMs );

	for( let i = 0; i < 3; i++ ) {
		const before = await readCurrentAiId( ctx );
		await demoClickMenubarNav( ctx , MENU_IDS.nextInstantiated );
		await waitForCurrentAiChange( ctx , before );
	}

	await demoClick( prompt.getByRole( 'button' , { name : 'Copy' } ).first() , ctx.pace );
	await demoPasteIntoCurrentAiComposer( ctx , DEMO_PROMPT_TEXT );
};

const readCurrentAiId = async( ctx:DemoContext ) => {
	const snapshot = await waitForE2ESnapshot(
		ctx.electronApp ,
		( state ) => state.kind === 'main' && state.currentAIViewKey.length > 0 ,
		20_000,
	);
	return snapshot.currentAIViewKey;
};

import { demoClick , demoFillSlow } from '../support/mouse';
import { beat } from '../support/pace';
import {
	demoClickMenubarNav ,
	demoOpenLeftPrompt ,
	demoPasteIntoCurrentAiComposer ,
	waitForCurrentAiChange ,
	waitForMainShell ,
	type DemoContext,
} from '../support/shell';
import { waitForE2ESnapshot } from '../../e2e/support/app-probe';
import { MENU_IDS } from '../../e2e/support/selectors';
