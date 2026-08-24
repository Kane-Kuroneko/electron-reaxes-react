/**
 * Ensure this clone keeps real symlinks (mode 120000) instead of
 * checking them out as plain-text path stubs (Windows Git default).
 *
 * Usage (from monorepo root):
 *   yarn tsx scripts/setup-git-symlinks.ts
 *   yarn tsx scripts/setup-git-symlinks.ts --restore
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const restore = process.argv.includes('--restore');

/**
 * Tracked 软链必须是**单文件**（mode 120000）。
 * 禁止把 skills 包目录或整棵 `.agents` 做成目录软链：Git 对目录软链内部
 * pathspec 会报 `fatal: pathspec '...' is beyond a symbolic link`。
 * 方言 `.claude/skills/<name>/` 等应是真实目录，只软链其中的 `SKILL.md`。
 * 子工程 `projects/ChatAIO/.claude` 等整棵方言目录软链是工作区发现入口，另论。
 */
const trackedSymlinkPaths = [
	'CLAUDE.md',
	'.claude/CLAUDE.md',
	'.claude/rules/coding-standard.md',
	'.claude/rules/ipc-coding.md',
	'.claude/rules/git-commit-policy.md',
	'.claude/rules/chat-aio-architecture.md',
	'.claude/skills/reaxes-development/SKILL.md',
	'.claude/skills/review-local-changes/SKILL.md',
	'.qoder/rules/coding-standard.md',
	'.qoder/rules/ipc-coding.md',
	'.qoder/rules/git-commit-policy.md',
	'.qoder/rules/chat-aio-architecture.md',
	'.qoder/skills/reaxes-development/SKILL.md',
	'.qoder/skills/review-local-changes/SKILL.md',
	'.cursor/rules/git-commit-policy.mdc',
	'.cursor/rules/coding-standard.mdc',
	'.cursor/rules/ipc-coding.mdc',
	'.cursor/rules/chat-aio-architecture.mdc',
	'.codex/AGENTS.md',
	'.codex/skills/reaxes-development/SKILL.md',
	'.codex/skills/review-local-changes/SKILL.md',
	'projects/ChatAIO/CLAUDE.md',
	'projects/ChatAIO/DOCS.md',
	'projects/ChatAIO/CODING_STANDARD.md',
	'projects/ChatAIO/.agents/README.md',
	'projects/ChatAIO/.agents/rules/chat-aio-architecture.md',
	'projects/ChatAIO/.agents/rules/coding-standard.md',
	'projects/ChatAIO/.agents/rules/git-commit-policy.md',
	'projects/ChatAIO/.agents/rules/ipc-coding.md',
	'projects/ChatAIO/.agents/skills/reaxes-development/SKILL.md',
	'projects/ChatAIO/.agents/skills/review-local-changes/SKILL.md',
	'projects/ChatAIO/.claude',
	'projects/ChatAIO/.qoder',
	'projects/ChatAIO/.codex',
	'projects/ChatAIO/.cursor/rules/git-commit-policy.mdc',
	'projects/ChatAIO/.cursor/rules/coding-standard.mdc',
	'projects/ChatAIO/.cursor/rules/ipc-coding.mdc',
	'projects/ChatAIO/.cursor/rules/chat-aio-architecture.mdc',
];

function git(args: string[]): string {
	return execFileSync('git', args, {
		cwd: repoRoot,
		encoding: 'utf8',
	}).trim();
}

function isSymlink(absPath: string): boolean {
	try {
		return fs.lstatSync(absPath).isSymbolicLink();
	} catch {
		return false;
	}
}

function main() {
	const before = git(['config', '--local', '--get', 'core.symlinks']);
	if (before !== 'true') {
		git(['config', '--local', 'core.symlinks', 'true']);
		console.log(`[setup-git-symlinks] core.symlinks: ${before || '(unset)'} → true`);
	} else {
		console.log('[setup-git-symlinks] core.symlinks already true');
	}

	const degraded: string[] = [];
	const missing: string[] = [];
	const ok: string[] = [];

	for (const rel of trackedSymlinkPaths) {
		const abs = path.join(repoRoot, rel);
		if (!fs.existsSync(abs) && !isSymlink(abs)) {
			// broken symlink: existsSync may be false; still check lstat
			try {
				if (fs.lstatSync(abs).isSymbolicLink()) {
					ok.push(rel);
					continue;
				}
			} catch {
				missing.push(rel);
				continue;
			}
			missing.push(rel);
			continue;
		}
		if (isSymlink(abs)) {
			ok.push(rel);
		} else {
			degraded.push(rel);
		}
	}

	console.log(`[setup-git-symlinks] ok=${ok.length} degraded=${degraded.length} missing=${missing.length}`);

	if (degraded.length) {
		console.log('[setup-git-symlinks] degraded (plain files, not symlinks):');
		for (const rel of degraded) console.log(`  - ${rel}`);
		if (restore) {
			git(['checkout', '--', ...degraded]);
			const stillBad = degraded.filter((rel) => !isSymlink(path.join(repoRoot, rel)));
			if (stillBad.length) {
				console.error('[setup-git-symlinks] restore failed for:');
				for (const rel of stillBad) console.error(`  - ${rel}`);
				console.error(
					'[setup-git-symlinks] Enable Windows Developer Mode (or SeCreateSymbolicLinkPrivilege), then re-run with --restore.',
				);
				process.exitCode = 1;
				return;
			}
			console.log('[setup-git-symlinks] restored via git checkout --');
		} else {
			console.log('[setup-git-symlinks] re-run with --restore to git checkout these paths');
			process.exitCode = 1;
		}
	}

	if (missing.length) {
		console.log('[setup-git-symlinks] not present in working tree (ok if not committed yet):');
		for (const rel of missing) console.log(`  - ${rel}`);
	}
}

main();
