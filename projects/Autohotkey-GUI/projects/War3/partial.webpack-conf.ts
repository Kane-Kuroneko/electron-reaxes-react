export const main = (
	//项目根目录,即`electron-reaxes-react`
	repoRootPath:string,
	//子工程目录,即/projects/Autohotkey-GUI/projects/War3
	subProjectRootPath:string
): WebpackConfiguration => {
	
	return {
		entry: {
			main: path.join(subProjectRootPath, "src/main.ts"),
			preload: path.join(subProjectRootPath, "src/preload.ts"),
		},
		output: {
			path: path.join(subProjectRootPath, "dist"),
			// iife : false,
			
		},
		plugins : [
			new CopyPlugin({
				patterns: [
					{ from: path.join(subProjectRootPath,'package.json'), to: path.join(subProjectRootPath,'dist/') },
				],
			})
		]
	};
	
};

export const renderer = (repoRootPath: string, subProjectRootPath: string): WebpackConfiguration => {
	return {
		
		entry: path.resolve(subProjectRootPath, "src/Renderer/index.tsx"),
		
		output: {
			path: path.join(subProjectRootPath, "dist/renderer"),
		},
		plugins: [
			new HtmlWebpackPlugin({
				template: path.join(subProjectRootPath, "../../engine/index.template.html"),
				filename: 'index.html',
				minify: false,
				hash: true,
				// inject: false,
			}),
		],
	};
};



import path,{} from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
