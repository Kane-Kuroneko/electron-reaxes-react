const MainWebpackConf: WebpackConf = {
	entry: path.join(absRepoRoot, "src/main.ts"),
	chunkFilename : (pathData,assetInfo) => {
		
	},
};

import path from 'path';
import { absRepoRoot } from "../../../../engine/toolkit";

type WebpackConf = import("webpack").Configuration;
