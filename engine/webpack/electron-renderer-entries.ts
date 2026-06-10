/**
 * Electron 多 renderer HTML 入口的薄封装。
 * 子工程只声明 entry 名称和源码路径，HtmlWebpackPlugin 细节留在公共构建层。
 */
export type ElectronRendererEntryMap = Record<string , string>;

export type ElectronRendererEntryConfigOptions = {
	projectRootPath: string;
	entries: ElectronRendererEntryMap;
	template: string;
	outputPath: string;
	filename?: string;
};

export const createElectronRendererEntryConfig = (
	options:ElectronRendererEntryConfigOptions,
):Configuration => {
	return {
		entry : resolveRendererEntries( options.projectRootPath , options.entries ) ,
		output : {
			path : options.outputPath ,
			filename : options.filename || '[name]/main.js',
		} ,
		plugins : createElectronRendererHtmlPlugins( options.entries , options.template ),
	};
};

const resolveRendererEntries = (
	projectRootPath:string ,
	entries:ElectronRendererEntryMap,
) => {
	return Object.fromEntries(
		Object.entries( entries ).map( ( [ name , entry ] ) => {
			return [
				name ,
				path.resolve( projectRootPath , entry ),
			];
		} ),
	);
};

const createElectronRendererHtmlPlugins = (
	entries:ElectronRendererEntryMap ,
	template:string,
) => {
	return Object.keys( entries ).map( name => {
		return new HtmlWebpackPlugin( {
			chunks : [ name ] ,
			filename : `${ name }/index.html` ,
			template ,
			minify : false ,
			hash : true,
		} );
	} );
};

import path from 'node:path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import type { Configuration } from 'webpack';
