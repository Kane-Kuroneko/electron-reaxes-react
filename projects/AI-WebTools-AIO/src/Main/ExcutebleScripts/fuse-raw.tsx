/**
 * 运行时注入raw中的动态变量
 */

export const fuseRaw = <I extends object>(injection:I , ...rawScripts ) => {
	
	return `
	(() => {
	
	${Object.keys(injection).reduce((accu,k) => {
		return accu + `const ${k} = ${JSON.stringify(injection[k])};\n`;
	},``)}
	
	${rawScripts.map(raw => {
		return raw;
	}).join('\n\n\n')}
	})();
	
	`;
}
