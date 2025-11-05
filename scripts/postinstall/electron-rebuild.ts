#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// 在ESM环境中获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
	const rootDir = path.resolve(__dirname, '../../');
	
	console.log('Starting electron-rebuild...');
	execSync('npx electron-rebuild -f -w better-sqlite3', {
		cwd: rootDir,
		stdio: 'inherit'
	});
	
	console.log('Electron rebuild completed successfully');
} catch (error) {
	console.error('Electron rebuild failed:', error);
	process.exit(1);
}
