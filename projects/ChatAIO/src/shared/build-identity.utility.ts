/**
 * 两层版本身份：发行 SemVer（app.getVersion）与 git build 身份拆开。
 * 不要把 count / hash 写进 updater 用的 version。
 * 打包脚本用的采集/注入在仓根 scripts/utils/git-build-identity.ts（ESM）；本文件只给 webpack 运行时。
 * 设计：docs/architecture/app-version-identity.md
 */

export type ChatAioBuildIdentity = {
	commit : string;
	count : number;
	dirty : boolean;
};

export const formatChatAioBuildSubtitle = ( identity : ChatAioBuildIdentity ) : string => {
	const base = `build ${ identity.count } · ${ identity.commit }`;
	return identity.dirty ? `${ base } · dirty` : base;
};

export const formatChatAioVersionLabel = (
	version : string ,
	identity : ChatAioBuildIdentity | null,
) : string => {
	if( !identity ) {
		return `v${ version }`;
	}
	return `v${ version } (${ formatChatAioBuildSubtitle( identity ) })`;
};

export const coerceChatAioBuildIdentity = ( raw : unknown ) : ChatAioBuildIdentity | null => {
	if( !raw || typeof raw !== 'object' ) {
		return null;
	}
	const rec = raw as Record<string , unknown>;
	const commit = typeof rec.commit === 'string' ? rec.commit.trim() : '';
	if( !/^[0-9a-f]{7,40}$/i.test( commit ) ) {
		return null;
	}
	const count = typeof rec.count === 'number'
		? rec.count
		: Number.parseInt( String( rec.count ) , 10 );
	if( !Number.isInteger( count ) || count < 0 ) {
		return null;
	}
	const dirty = rec.dirty === true || rec.dirty === 'true';
	return {
		commit ,
		count ,
		dirty ,
	};
};
