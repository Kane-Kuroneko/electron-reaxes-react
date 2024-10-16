const { ExternalsPlugin } = webpack;

export const electronRendererConf : WebpackConfiguration = {
	
	// target : "electron-renderer",
	
	externalsPresets : {
		// electron : true ,
	} ,
	plugins : [
		new webpack.ExternalsPlugin( 'commonjs' , [
			'electron',
		] ),
	],
	
}


import webpack from 'webpack';
