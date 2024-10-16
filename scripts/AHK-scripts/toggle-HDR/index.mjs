import {exec} from 'child_process';
import path from 'path';

const scriptPath = path.join('./check-hdr.ps1');


exec(`powershell -File ${scriptPath}`, (error, stdout, stderr) => {
	if (error) {
		console.error(`Error: ${error.message}`);
		return;
	}
	if (stderr) {
		console.error(`Stderr: ${stderr}`);
		return;
	}
	console.log(`Stdout: ${stdout}`);
});
