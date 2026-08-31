/**
 * 供应商目录 Ed25519 验签（只 verify，不 sign）。
 * 消息 = JSON 文件原始 UTF-8 字节（含换行）。.sig = raw 64 字节签名的标准 base64 一行。
 * 公钥 bundled：statics/ai-catalog/ed25519.pub。私钥禁止进 git。
 * 本批不 fetch；URL / host 白名单给批次 5 用。
 * 见 docs/feature-proposal--ai-catalog-source.md 批次 4。
 */

export const AI_CATALOG_RELEASE_OWNER = 'Kane-Kuroneko';
export const AI_CATALOG_RELEASE_REPO = 'ChatAIO-Releases';
export const AI_CATALOG_RELEASE_TAG = 'ai-catalog';
export const AI_CATALOG_JSON_FILENAME = 'default-ais.json';
export const AI_CATALOG_SIG_FILENAME = 'default-ais.json.sig';

export const AI_CATALOG_REMOTE_JSON_URL = `https://github.com/${ AI_CATALOG_RELEASE_OWNER }/${ AI_CATALOG_RELEASE_REPO }/releases/download/${ AI_CATALOG_RELEASE_TAG }/${ AI_CATALOG_JSON_FILENAME }`;
export const AI_CATALOG_REMOTE_SIG_URL = `${ AI_CATALOG_REMOTE_JSON_URL }.sig`;

const GITHUB_DOWNLOAD_PREFIX = `/${ AI_CATALOG_RELEASE_OWNER }/${ AI_CATALOG_RELEASE_REPO }/releases/download/${ AI_CATALOG_RELEASE_TAG }/`;
const ALLOWED_CATALOG_FILES = new Set( [
	AI_CATALOG_JSON_FILENAME ,
	AI_CATALOG_SIG_FILENAME ,
] );

/**
 * 远程目录只允许该 Releases 仓库的 github / objects.githubusercontent.com。
 * 批次 5 fetch 前必须过这一关。
 */
export const isAllowedAiCatalogDownloadUrl = ( url:string ):boolean => {
	let parsed:URL;
	try {
		parsed = new URL( url );
	} catch {
		return false;
	}
	if( parsed.protocol !== 'https:' ) {
		return false;
	}
	if( parsed.hostname === 'github.com' ) {
		if( !parsed.pathname.startsWith( GITHUB_DOWNLOAD_PREFIX ) ) {
			return false;
		}
		const file = parsed.pathname.slice( GITHUB_DOWNLOAD_PREFIX.length );
		return ALLOWED_CATALOG_FILES.has( file );
	}
	if(
		parsed.hostname === 'objects.githubusercontent.com'
		|| parsed.hostname === 'release-assets.githubusercontent.com'
	) {
		return true;
	}
	return false;
};

/** sidecar `.sig` 文本 → 64 字节 raw 签名。空串或长度不对返回 null。 */
export const decodeCatalogSignature = ( sigText:string ):Buffer | null => {
	const trimmed = sigText.trim();
	if( !trimmed ) {
		return null;
	}
	const bytes = Buffer.from( trimmed , 'base64' );
	if( bytes.length !== 64 ) {
		return null;
	}
	return bytes;
};

/**
 * 验签。缺 sig / 坏 key / 改过一个字节 → ok:false。不抛文案（无 UI）。
 */
export const verifyCatalogSignature = (
	payload:Buffer ,
	signature:Buffer | null ,
	publicKeyPem:string ,
):{ ok:boolean } => {
	if( !signature || signature.length !== 64 ) {
		return { ok : false };
	}
	if( !payload || payload.length === 0 ) {
		return { ok : false };
	}
	try {
		const key = createPublicKey( publicKeyPem );
		const ok = verify( null , payload , key , signature );
		return { ok };
	} catch {
		return { ok : false };
	}
};

import {
	createPublicKey ,
	verify,
} from 'node:crypto';
