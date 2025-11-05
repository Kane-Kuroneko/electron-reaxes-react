import fs from 'node:fs';
import path from 'path';

const projectRoot: string = path.resolve(__dirname, '..');
const repoRoot: string = path.resolve(__dirname, '../../../');
const targetDir: string = path.join(projectRoot, 'build');
const sourceFile: string = path.join(repoRoot, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
const linkFile: string = path.join(targetDir, 'better_sqlite3.node');

// 确保目标目录存在
fs.mkdirSync(targetDir, { recursive: true });

// 如果链接已存在，先删除
if (fs.existsSync(linkFile)) {
	fs.unlinkSync(linkFile);
	console.log('已删除已存在的符号链接:', linkFile);
}

try {
	// 使用内置方法创建符号链接，支持跨平台
	fs.symlinkSync(sourceFile, linkFile);
	console.log('符号链接创建成功:', linkFile);
} catch (err: any) {
	console.error('符号链接创建失败:', err.message);
	process.exit(1);
}
