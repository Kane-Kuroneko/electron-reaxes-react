export default {
	cacheDirectory: true, // 启用缓存以加速构建
	presets: [
		[
			"@babel/preset-env",
			{
				modules: false,
			},
		],
		[
			"@babel/preset-react",
			{
				runtime: "automatic",
			},
		],
		"@babel/preset-typescript",
	],
	plugins: [
		[
			"@babel/plugin-proposal-decorators",
			{
				legacy: true,
			},
		],
		"@babel/plugin-proposal-do-expressions",
		"@babel/plugin-proposal-duplicate-named-capturing-groups-regex",
		"@babel/plugin-proposal-export-default-from",
		"@babel/plugin-proposal-function-bind",
		"@babel/plugin-proposal-throw-expressions",
	],
};
