export const babelOptions = {
	presets : [
		"@babel/preset-env" ,
		[
			"@babel/preset-react" , {
			runtime : 'automatic' ,
		} ,
		] ,
		"@babel/preset-typescript" ,
	] ,
	plugins : [
		[
			"@babel/plugin-proposal-decorators" , {
			legacy : true ,
		} ,
		] ,
		"@babel/plugin-proposal-do-expressions" ,
		"@babel/plugin-proposal-duplicate-named-capturing-groups-regex" ,
		"@babel/plugin-proposal-export-default-from" ,
		"@babel/plugin-proposal-function-bind" ,
		"@babel/plugin-proposal-throw-expressions" ,
	] ,
};