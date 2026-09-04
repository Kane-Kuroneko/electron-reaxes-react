/**
 * 主进程 E2E 探针。只在 CHATAIO_E2E=1 时挂到 globalThis。
 * Settings WCV 已能作为 Playwright Page 点 DOM（waitForSettingsPage）。
 * 本探针继续覆盖写盘契约与壳层快照：getSnapshot（含 persistedAIIds / instantiatedAIIds）/ getSettings / applySettings / applyAIs / updateAI。
 * 设计：docs/features/e2e-playwright.md 、docs/features/manage-ais-save-scopes.md
 */

export type ChatAioE2ESnapshot = {
	kind : 'guiding' | 'main';
	currentAIViewKey : string;
	settingsViewOpened : boolean;
	promptLeftVisible : boolean;
	promptRightVisible : boolean;
	promptLeftWidth : number;
	promptRightWidth : number;
	enabledAIIds : string[];
	/* 含 disabled；顺序 = user-ais / effective 数组下标。切页与排序用例用。 */
	persistedAIIds : string[];
	/* 已创建的 AI WCV，按持久化相对序。Ctrl+[ ] / Previous Opened 走这条。 */
	instantiatedAIIds : string[];
	runtimeViewsReady : boolean;
	faults : string[];
};

export type ChatAioE2EApplyResult = {
	success : boolean;
	error? : string;
};

export const installE2EMainProbe = () => {
	if( isChatAioE2E() === false ) {
		return;
	}
	installE2EFaultCollector();
	( globalThis as ChatAioE2EGlobal ).__CHATAIO_E2E__ = {
		getSnapshot : readE2ESnapshot ,
		drainFaults : drainE2EFaults ,
		getSettings : readE2ESettings ,
		applySettings : applyE2ESettings ,
		applyAIs : applyE2EAIs ,
		updateAI : updateE2EAI,
	};
};

const emptySnapshot = ():ChatAioE2ESnapshot => {
	return {
		kind : 'guiding' ,
		currentAIViewKey : '' ,
		settingsViewOpened : false ,
		promptLeftVisible : false ,
		promptRightVisible : false ,
		promptLeftWidth : 0 ,
		promptRightWidth : 0 ,
		enabledAIIds : [] ,
		persistedAIIds : [] ,
		instantiatedAIIds : [] ,
		runtimeViewsReady : false ,
		faults : peekE2EFaults(),
	};
};

const clonePlain = <T>( value : T ) : T => {
	return JSON.parse( JSON.stringify( value ) ) as T;
};

const assertMainRuntimeStarted = () => {
	if( isMainRuntimeStarted() === false ) {
		throw new Error( 'E2E main runtime not started' );
	}
};

const readE2ESnapshot = ():ChatAioE2ESnapshot => {
	if( isMainRuntimeStarted() === false ) {
		return emptySnapshot();
	}
	const promptStore = reaxel_PromptViews.store;
	let enabledAIIds : string[] = [];
	let persistedAIIds : string[] = [];
	let instantiatedAIIds : string[] = [];
	try {
		const effectiveAIs = getAIConfigService().getEffectiveAIs();
		persistedAIIds = effectiveAIs.map( ( ai ) => ai.id );
		enabledAIIds = effectiveAIs
			.filter( ( ai ) => ai.disabled !== true )
			.map( ( ai ) => ai.id );
		const settings = reaxel_Settings().getCurrentSettings();
		instantiatedAIIds = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings )
			.map( ( runtimeView ) => runtimeView.id );
	} catch {
		enabledAIIds = [];
		persistedAIIds = [];
		instantiatedAIIds = [];
	}
	return {
		kind : 'main' ,
		currentAIViewKey : Reaxel_View.store.currentAIViewKey || '' ,
		settingsViewOpened : Reaxel_View.store.settingsViewOpened === true ,
		promptLeftVisible : promptStore.left.visible === true || promptStore.left.width > 0 ,
		promptRightVisible : promptStore.right.visible === true || promptStore.right.width > 0 ,
		promptLeftWidth : promptStore.left.width || 0 ,
		promptRightWidth : promptStore.right.width || 0 ,
		enabledAIIds ,
		persistedAIIds ,
		instantiatedAIIds ,
		runtimeViewsReady : Reaxel_View().areRuntimeViewsReady() === true ,
		faults : peekE2EFaults(),
	};
};

const readE2ESettings = () => {
	assertMainRuntimeStarted();
	return clonePlain( reaxel_Settings().getCurrentSettings() );
};

const applyE2ESettings = async( settings : Settings ) : Promise<ChatAioE2EApplyResult> => {
	assertMainRuntimeStarted();
	const result = await reaxel_Settings().applySettings( settings );
	return {
		success : result.success === true ,
		error : result.error,
	};
};

const applyE2EAIs = async( ais : Settings['AIs'] ) : Promise<ChatAioE2EApplyResult> => {
	assertMainRuntimeStarted();
	const result = await reaxel_Settings().applyAIs( ais );
	return {
		success : result.success === true ,
		error : result.error,
	};
};

const updateE2EAI = async( payload : {
	id : string;
	updates : Partial<Settings['AIs'][number]>;
} ) => {
	assertMainRuntimeStarted();
	const updated = await reaxel_Settings().persistUpdatedAI( payload.id , payload.updates );
	return updated ? clonePlain( updated ) : null;
};

type ChatAioE2EGlobal = typeof globalThis & {
	__CHATAIO_E2E__? : {
		getSnapshot : () => ChatAioE2ESnapshot;
		drainFaults : () => string[];
		getSettings : () => Settings;
		applySettings : ( settings : Settings ) => Promise<ChatAioE2EApplyResult>;
		applyAIs : ( ais : Settings['AIs'] ) => Promise<ChatAioE2EApplyResult>;
		updateAI : ( payload : {
			id : string;
			updates : Partial<Settings['AIs'][number]>;
		} ) => Promise<Settings['AIs'][number] | null>;
	};
};

import { isChatAioE2E } from './e2e-mode';
import { drainE2EFaults , installE2EFaultCollector , peekE2EFaults } from './e2e-faults';
import { isMainRuntimeStarted } from '#main/runtime';
import { Reaxel_View } from '#main/reaxels/Views';
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
import { reaxel_AIViews } from '#main/reaxels/Views/AI-Views';
import { reaxel_Settings } from '#main/reaxels/Settings';
import { getAIConfigService } from '#main/services/settings/ai-config-service';
import type { Settings } from '#src/Types/SettingsTypes';
