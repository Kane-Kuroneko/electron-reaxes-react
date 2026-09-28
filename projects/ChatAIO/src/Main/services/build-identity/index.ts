/**
 * 运行时解析 ChatAIO build 身份。
 * 已打包：只读 extraMetadata 写进 app package.json 的 chataioBuild。
 * 未打包：对 webpack 注入的仓根跑 git（yarn start:electron 的 cwd 是子工程，不是仓根）。
 * 设计：docs/architecture/app-version-identity.md
 */

export const resolveChatAioBuildIdentity = () : ChatAioBuildIdentity | null => {
	if( app.isPackaged ) {
		return readPackagedChatAioBuildIdentity();
	}
	try {
		return collectGitBuildIdentity( __REPO_ROOT__ );
	} catch ( error ) {
		console.warn(
			'[ChatAioBuildIdentity] unpackaged git collect failed:' ,
			error instanceof Error ? error.message : error ,
		);
		return null;
	}
};

const readPackagedChatAioBuildIdentity = () : ChatAioBuildIdentity | null => {
	try {
		const pkgPath = path.join( app.getAppPath() , 'package.json' );
		const pkg = JSON.parse( fs.readFileSync( pkgPath , 'utf8' ) ) as {
			chataioBuild? : unknown;
		};
		return coerceChatAioBuildIdentity( pkg.chataioBuild );
	} catch ( error ) {
		console.warn(
			'[ChatAioBuildIdentity] packaged package.json read failed:' ,
			error instanceof Error ? error.message : error ,
		);
		return null;
	}
};

import { collectGitBuildIdentity } from './collect-git';
import { coerceChatAioBuildIdentity } from '#shared/build-identity.utility';
import type { ChatAioBuildIdentity } from '#shared/build-identity.utility';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
