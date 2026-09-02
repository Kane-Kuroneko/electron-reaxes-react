/**
 * 主进程 E2E 探针。只在 CHATAIO_E2E=1 时挂到 globalThis，
 * 给 Playwright `electronApp.evaluate` 读可序列化快照。
 * WebContentsView 不是 Playwright Page，Settings / Prompt / AI 页用这份状态补齐。
 * 设计：docs/features/e2e-playwright.md
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
	faults : string[];
};

export const installE2EMainProbe = () => {
	if( isChatAioE2E() === false ) {
		return;
	}
	installE2EFaultCollector();
	( globalThis as ChatAioE2EGlobal ).__CHATAIO_E2E__ = {
		getSnapshot : readE2ESnapshot ,
		drainFaults : drainE2EFaults,
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
		faults : peekE2EFaults(),
	};
};

const readE2ESnapshot = ():ChatAioE2ESnapshot => {
	if( isMainRuntimeStarted() === false ) {
		return emptySnapshot();
	}
	const promptStore = reaxel_PromptViews.store;
	let enabledAIIds : string[] = [];
	try {
		enabledAIIds = getAIConfigService().getEffectiveAIs()
			.filter( ( ai ) => ai.disabled !== true )
			.map( ( ai ) => ai.id );
	} catch {
		enabledAIIds = [];
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
		faults : peekE2EFaults(),
	};
};

type ChatAioE2EGlobal = typeof globalThis & {
	__CHATAIO_E2E__? : {
		getSnapshot : () => ChatAioE2ESnapshot;
		drainFaults : () => string[];
	};
};

import { isChatAioE2E } from './e2e-mode';
import { drainE2EFaults , installE2EFaultCollector , peekE2EFaults } from './e2e-faults';
import { isMainRuntimeStarted } from '#main/runtime';
import { Reaxel_View } from '#main/reaxels/Views';
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
import { getAIConfigService } from '#main/services/settings/ai-config-service';
