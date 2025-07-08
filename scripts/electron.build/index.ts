import { spawnSync } from "child_process";
import { join } from "path";
import { existsSync } from "fs";
import { getProjectPaths  } from '../../engine/toolkit/project-paths';

const {absolutelyPath_subproject} = getProjectPaths();

// 可选参数：子目录路径，默认是 ./app
const targetDir = process.argv[2] ?? "app";
const absolutePath = join(process.cwd(), targetDir);

if (!existsSync(absolutelyPath_subproject)) {
	console.error(`目录不存在: ${absolutelyPath_subproject}`);
	process.exit(1);
}

console.log(`进入目录: ${absolutelyPath_subproject}`);
process.chdir(absolutelyPath_subproject);

// 执行 electron-builder build -w
const result = spawnSync("npx", ["electron-builder", "build", "-w"], {
	stdio: "inherit",
	shell: true
});

if (result.error) {
	console.error("构建失败:", result.error.message);
	process.exit(1);
}

process.exit(result.status ?? 1);
