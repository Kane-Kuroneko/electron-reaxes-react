/**
 * 入参`subProject`,形如"Autohotkey-GUI/War3"
 * @example
 * `subProjectRootPath` : 返回subProject到repositryRoot的相对路径,如"/projects/Autohotkey-GUI/projects/War3"
 * `subProjectName` : 返回subProject的repoName,如"War3"
 * `subProjectDistPath` : 返回打包产物路径,如"/projects/Autohotkey-GUI/projects/War3/dist"
 */
export const getProjectPaths = (subProject:string = project, defaultSubFolder = 'projects', splitter = '/') => {
	//最终应该是'/projects/Autohotkey-GUI/projects/war3'这样的路径
	let subProjectRootPath = '/projects/';
	//subProjectName不能以/结尾
	if(subProject.endsWith('/')){
		subProject = subProject.slice(0, subProject.length - 1);
	}
	if(subProject.includes('/')){
		subProjectRootPath += subProject.split(splitter).join("/projects/");
	}else {
		subProjectRootPath += subProject;
	}
	
	subProjectRootPath = path.resolve( path.join( absolutelyPath_RepositoryRoot , subProjectRootPath ) );
	
	const absolutelyPath_subproject = subProjectRootPath;
	const absolutelyPath_subprojectDist = path.join(absolutelyPath_subproject, "dist");
	const name_subproject = subProject.split('/').pop();
	
	return {
		absolutelyPath_subproject,
		name_subproject,
		absolutelyPath_subprojectDist,
	}
}

getProjectPaths.default = getProjectPaths();

import { absolutelyPath_RepositoryRoot } from './repo-paths';
import { project } from '../toolkit/entrance';
import path from 'path';
