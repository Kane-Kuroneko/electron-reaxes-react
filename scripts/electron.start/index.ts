import path from 'node:path';
import { spawn } from 'node:child_process';
import { getProjectPaths , absolutelyPath_RepositoryRoot } from '../../engine/toolkit/paths.ts';


const { absolutelyPath_subproject } = getProjectPaths.default;

const absolutelyElectronExe = path.join( absolutelyPath_RepositoryRoot , 'node_modules/electron/dist/electron.exe' );

// 使用 spawn 来启动 Electron
const electronProcess = spawn(absolutelyElectronExe, ['.','--inspect=5858'], {
	cwd: absolutelyPath_subproject, // 设置当前工作目录为 subproject 路径
	stdio: 'inherit', // 忽略 stdin, 监听 stdout 和 stderr
	env :{
		NODE_OPTIONS: '--enable-source-maps'
	}
});

// 实时获取 stdout 和 stderr
// electronProcess.stdout.on('data', (data) => {
// 	console.log(`stdout1111: ${data.toString()}`);
// });

// electronProcess.stderr.on('data', (data) => {
// 	console.error(`stderr: ${data.toString()}`);
// });

// 监听进程关闭
electronProcess.on('close', (code) => {
	console.log(`Electron process closed with code: ${code}`);
});

electronProcess.on('exit', (code) => {
	console.log(`Electron process exited with code: ${code}`);
});

electronProcess.on('error', (err) => {
	console.error(`Electron process error: ${err}`);
});
