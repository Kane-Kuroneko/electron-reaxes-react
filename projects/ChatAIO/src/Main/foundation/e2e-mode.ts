/**
 * Playwright 驱动 unpackaged Electron 的运行时闸门（E2E 与产品演示共用）。
 * 仅当 CHATAIO_E2E=1 时为真：隔离 userData、走 dist renderer、挂探针。
 * 生产安装包与日常 `yarn start:electron` 不受影响。
 * 演示另设 CHATAIO_DEMO=1，场景在 demo/，不要写进 e2e/tests。
 * 设计：docs/features/e2e-playwright.md 、docs/features/playwright-demo-record.md
 */

export const isChatAioE2E = () => {
	return process.env.CHATAIO_E2E === '1';
};

/** 产品演示（OBS）。与 E2E 共用 CHATAIO_E2E 闸门，另用此旗把 Guiding 默认主题钉成浅色。 */
export const isChatAioDemo = () => {
	return process.env.CHATAIO_DEMO === '1';
};

/** E2E 走生产 renderer 文件，避免依赖 webpack-dev-server。 */
export const shouldUseDevRendererServer = () => {
	return dev() && isChatAioE2E() === false;
};

import { dev } from 'electron-is';
