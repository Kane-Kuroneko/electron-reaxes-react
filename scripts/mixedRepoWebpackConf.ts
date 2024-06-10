import { repo, absRepoRoot } from "../engine/toolkit";
import { webpackBaseConfig } from "../engine/webpack/base.conf";
import { merge } from "webpack-merge";


const repoPartialWebpackConfig = (await import(`${absRepoRoot}/build/webpack.conf.ts`)).default;

export const mixedRepoWebpackConf = merge(webpackBaseConfig , repoPartialWebpackConfig);
