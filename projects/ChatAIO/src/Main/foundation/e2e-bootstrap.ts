/**
 * 必须是 `src/Main/index.ts` 的第一个 import。
 * ESM / webpack 会先求值本模块，再加载 before-launch 那一大坨依赖；
 * 否则 import 期 uncaughtException 会先弹 Electron 原生框，探针还没挂上。
 * 设计：docs/features/e2e-playwright.md
 */

installE2EFaultCollector();

import { installE2EFaultCollector } from './e2e-faults';
