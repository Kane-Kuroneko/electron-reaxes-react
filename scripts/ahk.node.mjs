import {spawn} from 'node:child_process';
// import inquirer from 'inquirer';


const ahk = spawn('./AHK2/AutoHotkey64.exe',["AHK-scripts/node-spawn-test/index.ahk"])


ahk.stdout.on('data' , (textBody) => {
	Buffer.isBuffer(textBody) && (textBody = textBody.toString());
	
	const json = JSON.parse(textBody);
	
	if ( json.type === 'question' ) {
		
		ahk.stdin.write(JSON.stringify({
			type : 'login',
			data : 'Kaneeeee',
		}));
		ahk.stdin.end();
		console.log(`\n名字已发送给AHK`);
	} else if ( json.type === 'greeting' ) {
		console.log(json.data);
	}
	
});
ahk.stderr.on('error',(err) => {
	console.log(err);
})
// ahk.stdin.on('',() => {
//	
// })
