/**
 * unpackaged Main 采集入口。实现在仓根 ESM scripts/utils，避免 electron.build 从 ChatAIO CJS named import。
 * 设计：docs/architecture/app-version-identity.md
 */

export { collectGitBuildIdentity } from '#root/scripts/utils/git-build-identity';
export type { GitExec } from '#root/scripts/utils/git-build-identity';
