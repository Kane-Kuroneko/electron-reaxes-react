import fs from 'node:fs';
import path from 'path';

const projectRoot: string = path.resolve(__dirname, '..');
const repoRoot: string = path.resolve(__dirname, '../../../');
const targetDir: string = path.join(projectRoot, 'build');
const sourceFile: string = path.join(repoRoot, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
const linkFile: string = path.join(targetDir, 'better_sqlite3.node');

// 确保目标目录存在
fs.mkdirSync(targetDir, { recursive: true });

// 强制删除已存在的文件/符号链接/目录（force:true 在目标不存在时也静默通过）
fs.rmSync(linkFile, { force: true, recursive: true });

try {
	// 使用内置方法创建符号链接，支持跨平台
	fs.symlinkSync(sourceFile, linkFile);
	console.log('符号链接创建成功:', linkFile);
} catch (err: any) {
	// 兜底：若因竞态或缓存残留仍 EEXIST，再强制删除一次并重试
	if (err.code === 'EEXIST') {
		fs.rmSync(linkFile, { force: true, recursive: true });
		fs.symlinkSync(sourceFile, linkFile);
		console.log('符号链接创建成功(兜底重试):', linkFile);
	} else {
		console.error('符号链接创建失败:', err.message);
		process.exit(1);
	}
}
