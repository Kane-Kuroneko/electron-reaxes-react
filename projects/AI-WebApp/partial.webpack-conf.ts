const { ProvidePlugin } = webpack;

export const main = (
	//项目根目录,即`electron-reaxes-react`
	repoRootPath:string,
	//子工程目录,即/projects/Autohotkey-GUI/projects/War3
	subProjectRootPath:string
): Configuration => {
	
	return {
		entry: path.join(subProjectRootPath, "src/Main/index.ts"),
		output: {
			path: path.join(subProjectRootPath, "dist"),
		},
		resolve :{
			alias : {
				'#main' : path.join(subProjectRootPath,'src/Main'),
				'#renderer' : path.join(subProjectRootPath,'src/Renderer'),
				'#src' : path.join(subProjectRootPath,'src'),
				'#generics' : path.join(repoRootPath,'generic-services'),
			}
		},
		plugins : [
			// new CopyPlugin( {
			// patterns : [
			// { 
			//    from : path.join( subProjectRootPath , 'package.json' ) , 
			//    to : path.join( subProjectRootPath , 'dist/statics' ) 
			// } ,
			// {
			//    from : path.join( subProjectRootPath , 'src/ahk-scripts' ) ,
			//    to : path.join( subProjectRootPath , 'dist/statics/ahk-scripts' ) ,
			// } ,
			// ] ,
			// } ),
		],
	};
	
};


export const renderer = (repoRootPath: string, subProjectRootPath: string): Configuration => {
	const rendererEntryConfig = createElectronRendererEntryConfig( {
		projectRootPath : subProjectRootPath ,
		entries : AI_WEBAPP_RENDERER_ENTRY_POINTS ,
		template : path.join( subProjectRootPath , 'engine/index.template.html' ) ,
		outputPath : path.join( subProjectRootPath , 'dist/renderer' ) ,
		filename : '[name]/main.js',
	} );
	return {
		// stats:"verbose",
		experiments: {
			topLevelAwait: true,  // 启用顶层 await
		},
		...rendererEntryConfig,
		resolve :{
			alias : {
				'#main' : path.join(subProjectRootPath,'src/Main'),
				'#renderer' : path.join(subProjectRootPath,'src/Renderer'),
				'#src' : path.join(subProjectRootPath,'src'),
				'#generics' : path.join(repoRootPath,'generic-services'),
			},
		},
		plugins : [
			...( rendererEntryConfig.plugins ?? [] ) ,
			new ProvidePlugin( {
				
				'I18n' : [ '#src/Views/SettingsView/reaxels/exports' , 'I18n' ] ,
				'i18n' : [ '#src/Views/SettingsView/reaxels/exports' , 'i18n' ] ,
			} ),
		],
	};
};

export const preload = ( repoRootPath: string , subProjectRootPath: string ): Configuration => {
	return {
		entry: {
			preload : path.join(subProjectRootPath, "src/preload.ts"),
			"ai-page-preload" : path.join(subProjectRootPath, "src/ai-page-preload.ts"),
		},
		output : {
			filename : '[name].js',
		},
		resolve :{
			alias : {
				'#main' : path.join(subProjectRootPath,'src/Main'),
				'#renderer' : path.join(subProjectRootPath,'src/Renderer'),
				'#src' : path.join(subProjectRootPath,'src'),
				'#generics' : path.join(repoRootPath,'generic-services'),
			},
		},
		watch:true
	};
};
import { createElectronRendererEntryConfig } from '../../engine/webpack/electron-renderer-entries';
import { AI_WEBAPP_RENDERER_ENTRY_POINTS } from './src/shared/renderer-entries';
import path from 'path';
import webpack , { type Configuration } from 'webpack';
