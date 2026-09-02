/**
 * Playwright E2E 运行时闸门。
 * 仅当测试以 CHATAIO_E2E=1 启动 unpackaged Electron 时为真。
 * 生产安装包与日常 `yarn start:electron` 不受影响。
 * 设计：docs/features/e2e-playwright.md
 */

export const isChatAioE2E = () => {
	return process.env.CHATAIO_E2E === '1';
};

/** E2E 走生产 renderer 文件，避免依赖 webpack-dev-server。 */
export const shouldUseDevRendererServer = () => {
	return dev() && isChatAioE2E() === false;
};

import { dev } from 'electron-is';
