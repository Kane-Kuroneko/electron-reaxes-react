
/* electron-reaxes-react目录的绝对路径,返回F:/electron-reaxes-react/   */
export const absProjectRootDir = process.cwd();

/*electron-reaxes-react目录的文件路径,返回file:///F:/electron-reaxes-react/     */
export const absProjectRootFileURL = pathToFileURL(absProjectRootDir).href;

export const absEngineRootDir = path.join(absProjectRootDir, "engine");

import { pathToFileURL } from "url";
import process from "process";
import path from 'path';
