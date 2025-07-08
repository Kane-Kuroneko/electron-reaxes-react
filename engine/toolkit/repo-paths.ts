
/*工程根目录,也是启动nodejs的目录,Z:/electron-reaxes-react/*/
export const absolutelyPath_RepositoryRoot = process.cwd();

//electron-reaxes-react目录的文件路径,返回file:///F:/electron-reaxes-react/
export const absolutelyFileProtocolPath_RepositoryRoot = pathToFileURL(absolutelyPath_RepositoryRoot).href;

//
export const absolutelyPath_Engine = path.join( absolutelyPath_RepositoryRoot , 'engine' );

//
export const absolutelyPath_Projects = path.join( absolutelyPath_RepositoryRoot , 'projects' );

//
export const absolutelyPath_GenericServices = path.join( absolutelyPath_RepositoryRoot , 'generic-services' );



// console.log(111111111,getProjectPaths.default.absolutelyPath_subprojectDist);

import { pathToFileURL } from "url";
import process from "process";
import path from 'path';
