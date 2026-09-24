/**
 * ChatAIO 两层身份：仓根 git 采集 + electron-builder 注入。
 * 必须放在仓根 scripts/（"type":"module"）。不要从 projects/ChatAIO（CommonJS）named import，tsx 会报
 * "does not provide an export named ..."。
 * 设计：projects/ChatAIO/docs/architecture/app-version-identity.md
 */

export type GitExec = ( args : string[] , cwd : string ) => string;

/** Windows FILEVERSION 第四段上限；超出仍把真实 count 写进 extraMetadata。 */
export const WINDOWS_FILEVERSION_MAX_BUILD = 65535;

export const CHATAIO_RELEASE_ARTIFACT_NAME = '${productName}-${version}-${os}-${arch}.${ext}';

export const isChatAioReleaseBuild = ( env : NodeJS.ProcessEnv = process.env ) : boolean => {
	return env.CHATAIO_RELEASE === '1' || env.CHATAIO_RELEASE === 'true';
};

export const toElectronBuilderBuildNumber = ( count : number ) : string => {
	if( !Number.isInteger( count ) || count < 0 ) {
		return '0';
	}
	if( count > WINDOWS_FILEVERSION_MAX_BUILD ) {
		return String( WINDOWS_FILEVERSION_MAX_BUILD );
	}
	return String( count );
};

export const gitCommitArtifactToken = ( identity : ChatAioBuildIdentity ) : string => {
	return identity.dirty ? `${ identity.commit }.dirty` : identity.commit;
};

export const localChatAioArtifactName = ( artifactToken : string ) : string => {
	return `\${productName}-\${version}-b\${buildNumber}.${ artifactToken }-\${os}-\${arch}.\${ext}`;
};

const defaultExecGit : GitExec = ( args , cwd ) => {
	return execFileSync( 'git' , args , {
		cwd ,
		encoding : 'utf8' ,
		timeout : 10_000 ,
		windowsHide : true ,
	} );
};

export const collectGitBuildIdentity = (
	repoRoot : string ,
	execGit : GitExec = defaultExecGit,
) : ChatAioBuildIdentity => {
	if( !repoRoot ) {
		throw new Error( '[ChatAioBuildIdentity] repoRoot is empty' );
	}
	const countText = execGit( [ 'rev-list' , '--count' , 'HEAD' ] , repoRoot ).trim();
	const count = Number.parseInt( countText , 10 );
	if( !Number.isInteger( count ) || count < 0 ) {
		throw new Error( `[ChatAioBuildIdentity] invalid rev-list count: ${ countText }` );
	}
	const commit = execGit( [ 'rev-parse' , '--short=9' , 'HEAD' ] , repoRoot ).trim();
	if( !/^[0-9a-f]{7,40}$/i.test( commit ) ) {
		throw new Error( `[ChatAioBuildIdentity] invalid rev-parse hash: ${ commit }` );
	}
	const porcelain = execGit( [ 'status' , '--porcelain' ] , repoRoot );
	return {
		commit ,
		count ,
		dirty : porcelain.trim().length > 0 ,
	};
};

export const decorateElectronBuilderForChatAioIdentity = ( input : {
	args : string[];
	env : NodeJS.ProcessEnv;
	identity : ChatAioBuildIdentity;
	isRelease : boolean;
} ) : { args : string[]; env : NodeJS.ProcessEnv } => {
	const env = {
		...input.env ,
		BUILD_NUMBER : toElectronBuilderBuildNumber( input.identity.count ) ,
		CHATAIO_GIT_COMMIT : input.identity.commit ,
	};
	const args = [
		...input.args ,
		`-c.extraMetadata.chataioBuild.commit=${ input.identity.commit }` ,
		`-c.extraMetadata.chataioBuild.count=${ input.identity.count }` ,
		`-c.extraMetadata.chataioBuild.dirty=${ input.identity.dirty ? 'true' : 'false' }`,
	];
	if( input.isRelease === false ) {
		args.push( `-c.artifactName=${ localChatAioArtifactName( gitCommitArtifactToken( input.identity ) ) }` );
	}
	return {
		args ,
		env ,
	};
};

import type { ChatAioBuildIdentity } from '../../projects/ChatAIO/src/shared/build-identity.utility';
import { execFileSync } from 'node:child_process';
