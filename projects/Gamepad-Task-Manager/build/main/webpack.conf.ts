const {
	absolutelyPath_subprojectDist , 
	name_subproject ,
	absolutelyPath_subproject  
} = getProjectPaths.default;

const MainWebpackConf: WebpackConf = {
	entry: {
		main : path.join(absolutelyPath_subproject, "src/main.ts"),
		preload : path.join( absolutelyPath_subproject , 'src/preload.ts' ),
	},
};

import path from 'path';
import {project, absolutelyPath_RepositoryRoot , getProjectPaths } from "../../../../engine/toolkit";


type WebpackConf = import("webpack").Configuration;
