import fs from 'node:fs';
import path from 'path';

const projectRoot: string = path.resolve(__dirname, '..');
const repoRoot: string = path.resolve(__dirname, '../../../');
const targetDir: string = path.join(projectRoot, 'build');
const sourceFile: string = path.join(repoRoot, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
const targetFile: string = path.join(targetDir, 'better_sqlite3.node');

// 确保目标目录存在
fs.mkdirSync(targetDir, { recursive: true });

console.log('源文件:', sourceFile);
console.log('目标文件:', targetFile);

// 检查源文件是否存在
if (!fs.existsSync(sourceFile)) {
	console.error('源文件不存在:', sourceFile);
	process.exit(1);
}

// 使用 cpSync 替代 symlinkSync — 跨平台更可靠，避免 EEXIST/符号链接兼容性问题
fs.cpSync(sourceFile, targetFile, { force: true, dereference: true });
console.log('better_sqlite3.node 拷贝成功:', targetFile);
