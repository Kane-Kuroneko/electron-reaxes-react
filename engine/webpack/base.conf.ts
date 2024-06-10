const cssLoaderOptions = {
	sourceMap: true,
	modules: {
		exportLocalsConvention: 'dashes',
		localIdentName: '[local]--[hash:base64:4]',
	},
};
const { ProvidePlugin , DefinePlugin} = webpack;

/**
 * suggest dev环境建议使用全量source-map , 否则可能会导致错误栈无法定位到正确的模块
 */
/*webpack基础配置*/
export const webpackBaseConfig:WebpackConf = {
	mode: node_env as any,
	output: {
		filename: node_env === 'development' ? '[name].bundle.js' : '[name].bundle.[contenthash:6].js',
		path : path.join(absProjectRootDir ,'packages' , repo , 'dist'),
		// publicPath : path.resolve(rootPath , 'dist') ,
	},
	resolve: {
		aliasFields: ['browser'],
		alias: {
			'#root': absProjectRootDir,
			'#packages': path.join(absProjectRootDir,'packages'),
			'reaxes': path.join(absProjectRootDir, 'packages/reaxes'),
			'reaxes-toolkit': path.join(absProjectRootDir, 'packages/reaxes-toolkit'),
			'reaxes-utils': path.join(absProjectRootDir, 'packages/reaxes-utils'),
			'reaxels': path.join(absProjectRootDir, 'packages/reaxels'),
			'reaxes-react': path.join(absProjectRootDir, 'packages/reaxes-react'),
			'reaxes-vue2': path.join(absProjectRootDir, 'packages/reaxes-vue2'),
			'reaxes-vue3': path.join(absProjectRootDir, 'packages/reaxes-vue3'),
			'reaxes-angular': path.join(absProjectRootDir, 'packages/reaxes-angular'),
		},
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
	},
	devtool: 'cheap-source-map',
	module: {
		rules: [
			{
				test: /\.m?js$/,
				resolve: {
					fullySpecified: false,
				},
			},
			/*for react/ts/tsx etc. generation js files */
			{
				test: (filename) => {
					/*排除.vue文件和.vue.xx*/
					if(/\.vue\b/i.test(filename)){
						return;
					}
					return /\.(jsx?|tsx?)$/i.test(filename);
				},
				use: {
					loader: 'babel-loader',
					options : babelConf,
				},
				exclude: [
					/node_modules/,
				],
			},
			{
				test: /\.module\.less$/,
				use: [
					{
						loader: 'style-loader',
					},
					{
						loader: 'css-loader',
						options: cssLoaderOptions,
					},
					{
						loader: 'less-loader',
						options: {
							sourceMap: true,
							lessOptions: {
								javascriptEnabled: true,
							},
						},
					},
				],
			},
			{
				test: /(?<!(\.module|\.theme))\.less$/,
				use: [
					{
						loader: 'style-loader',
					},
					{
						loader: 'css-loader',
						options: _.pick(cssLoaderOptions, ['sourceMap']),
					},
					{
						loader: 'less-loader',
						options: {
							sourceMap: true,
							lessOptions: {
								javascriptEnabled: true,
							},
						},
					},
				],
			},
			{
				test: /\.module\.css$/,
				use: [
					{
						loader: 'style-loader',
					},
					{
						loader: 'css-loader',
						options: cssLoaderOptions,
					},
				],
			},
			{
				test: /(?<!(\.module|\.theme))\.css$/,
				use: [
					{
						loader: 'style-loader',
					},
					{
						loader: 'css-loader',
						options: _.pick(cssLoaderOptions, ['sourceMap']),
					},
				],
			},
			{
				test: /\.theme\.(le|c)ss$/, // type :  "asset/source",
				use: [
					{
						loader: 'css-loader',
						options: _.pick(cssLoaderOptions, ['sourceMap']),
					},
					{
						loader: 'less-loader',
						options: {
							sourceMap: true,
							lessOptions: {
								javascriptEnabled: true,
							},
						},
					},
				],
			},
			{
				test: /\.(png|jpe?g|te?xt|gif|woff|woff2|eot|ttf|otf|bmp|swf|mp4)$/,
				type: 'asset/resource',
				generator: {
					filename: 'static/[hash][ext][query]',
				},
				parser: {
					dataUrlCondition: {
						maxSize: 20 * 1024,
					},
				},
			},
			{
				test: /\.component\.svg$/,
				use: ['@svgr/webpack'],
			},
			{
				test: /(?<!\.component)\.svg$/,
				type: 'asset/resource',
			},
		],
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				extractComments: false,
				terserOptions: {
					format: {
						comments: false,
					},
				},
			}),
		],
	},
	performance: {
		maxEntrypointSize: 10000000,
		maxAssetSize: 30000000,
	},
	stats: 'errors-only',
	plugins: [
		new ProvidePlugin({
			_: ['lodash'],
			React: ['react'],
			useState: ['react', 'useState'],
			useEffect: ['react', 'useEffect'],
			useRef: ['react', 'useRef'],
			useLayoutEffect: ['react', 'useLayoutEffect'],
			useMemo: ['react', 'useMemo'],
			useCallback: ['react', 'useCallback'],
		}),
		new DefinePlugin({
			RepoRoot : `'${absProjectRootDir}'`,
		}),
	],
};

import { WebpackConf } from "./webpackConf";
import babelConf from '../babel/conf';
import _ from 'lodash';
import path from 'path';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import './pre-exec.mjs';
import {node_env , repo ,absRepoRoot , absProjectRootDir  } from '../toolkit';
