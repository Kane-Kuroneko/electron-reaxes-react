// Modules to control application life and create native browser window
// This file serves as the entry point that orchestrates the startup sequence

/* E2E 故障收集必须先于 before-launch 依赖图。docs/features/e2e-playwright.md */
import './foundation/e2e-bootstrap';

// Before-Launch: Synchronous initialization before app.whenReady()
import './before-launch';

// When-Ready: Asynchronous initialization after app.whenReady()
import './when-ready';
