/**
 * tsx/esbuild keep-names 会把 `const foo = () => {}` 编成 `__name(() => {}, "foo")`。
 * Playwright 把函数 toString 后丢进页面，页面没有 `__name`，evaluate / addInitScript 直接炸。
 * 演示光标和 AI composer 探测都因此失败。先垫一层再跑页内脚本。
 * 见 https://github.com/privatenumber/tsx/issues/113
 */

export const TSX_EVAL_NAME_SHIM = 'globalThis.__name = globalThis.__name || ((target) => target);';

export const installTsxEvalShim = async( target:EvalTarget ) => {
	try {
		await target.evaluate( TSX_EVAL_NAME_SHIM );
	} catch {
		/* 已销毁 / 跨域 */
	}
};

type EvalTarget = {
	evaluate : Page['evaluate'];
	addInitScript?:Page['addInitScript'];
};

import type { Page } from '@playwright/test';
