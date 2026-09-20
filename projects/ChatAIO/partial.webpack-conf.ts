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
				'#shared' : path.join(subProjectRootPath,'src/shared'),
				'#generics' : path.join(repoRootPath,'generic-services'),
				'#Views/shared' : path.join(subProjectRootPath,'src/Views/shared'),
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
	const chatAioSrc = path.join(subProjectRootPath, 'src');
	const tailwindViewRoots = [
		path.join(chatAioSrc, 'Views/shared'),
		path.join(chatAioSrc, 'Views/SettingsView'),
		path.join(chatAioSrc, 'Views/PromptView'),
		path.join(chatAioSrc, 'Views/GuidingView'),
	];
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
				'#shared' : path.join(subProjectRootPath,'src/shared'),
				'#generics' : path.join(repoRootPath,'generic-services'),
				'#MainView' : path.join(subProjectRootPath,'src/Views/MainView'),
				'#SettingsView' : path.join(subProjectRootPath,'src/Views/SettingsView'),
				'#FloatingView' : path.join(subProjectRootPath,'src/Views/FloatingView'),
				'#GuidingView' : path.join(subProjectRootPath,'src/Views/GuidingView'),
				'#PromptView' : path.join(subProjectRootPath,'src/Views/PromptView'),
				'#DropdownView' : path.join(subProjectRootPath,'src/Views/DropdownView'),
				'#Views/shared' : path.join(subProjectRootPath,'src/Views/shared'),
			},
		},
		module : {
			rules : [
				/*
				 * ChatAIO 才走 Tailwind。只 prepend postcss，不复制 style/css 链。
				 * include 限定迁移 View，避免扫到 FloatingView / swiper 或其它工程。
				 * 见 docs/features/settings-ui-shadcn.md
				 */
				{
					test : /\.css$/ ,
					include : tailwindViewRoots ,
					enforce : 'pre' ,
					use : [
						{
							loader : 'postcss-loader' ,
							options : {
								postcssOptions : {
									config : path.join(subProjectRootPath, 'postcss.config.cjs'),
								},
							},
						},
					],
				},
			],
		},
		plugins : [
			...( rendererEntryConfig.plugins ?? [] ) ,
			new ProvidePlugin( {
				
				'I18n' : [ '#SettingsView/reaxels/exports' , 'I18n' ] ,
				'i18n' : [ '#SettingsView/reaxels/exports' , 'i18n' ] ,
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
				'#shared' : path.join(subProjectRootPath,'src/shared'),
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
