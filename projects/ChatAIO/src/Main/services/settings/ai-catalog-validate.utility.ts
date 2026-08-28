/**
 * 校验 AI 供应商目录 JSON（bundled / cache / 将来的远程）。纯函数，不进 renderer，不读盘。
 * 校验的是瘦供应商行：UUID、family 合法、每 family 一行、url http(s)、region 形状/ISO、重复 id 非法。
 * 不校验、不抄写 proxy / disabled / preload / url_override。
 * 失败只返回 ok:false。host 不匹配则该行 family 降 custom，不丢行。
 * 见 docs/feature-proposal--ai-catalog-source.md（方向纠偏后的批次 3）。
 */

export const KNOWN_CATALOG_SCHEMA_VERSION = 1;
export const CATALOG_AIS_MAX_COUNT = 200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** family → 允许的 hostname，与 bundled 官方入口主机一致。custom 不限制。 */
const FAMILY_ALLOWED_HOSTS: Partial<Record<AI.AIFamily , readonly string[]>> = {
	chatgpt : [ 'chatgpt.com' ] ,
	grok : [ 'grok.com' ] ,
	gemini : [ 'gemini.google.com' ] ,
	deepseek : [ 'chat.deepseek.com' ] ,
	perplexity : [ 'www.perplexity.ai' ] ,
	claude : [ 'claude.ai' ] ,
	manus : [ 'manus.im' ] ,
	aistudio : [ 'aistudio.google.com' ] ,
	copilot : [ 'copilot.microsoft.com' ] ,
	'meta-ai' : [ 'www.meta.ai' ] ,
	poe : [ 'poe.com' ] ,
	mistral : [ 'chat.mistral.ai' ] ,
	doubao : [ 'www.doubao.com' ] ,
	qianwen : [ 'tongyi.aliyun.com' ] ,
	kimi : [ 'kimi.moonshot.cn' ] ,
	chatglm : [ 'chatglm.cn' ] ,
	yuanbao : [ 'yuanbao.tencent.com' ] ,
	hailuo : [ 'hailuoai.com' ] ,
	yiyan : [ 'yiyan.baidu.com' ] ,
	'dev-proxy-test' : [ 'whatismyipaddress.com' ],
};

const isKnownFamily = ( family:string ):family is AI.AIFamily => {
	return family === 'custom' || Object.prototype.hasOwnProperty.call( FAMILY_ALLOWED_HOSTS , family );
};

const isUuid = ( id:string ):boolean => {
	return UUID_RE.test( id );
};

export const validateCatalog = (
	input:unknown ,
	options:AICatalog.ValidateOptions = {},
):AICatalog.ValidateResult => {
	if( !input || typeof input !== 'object' ) {
		return { ok : false };
	}
	const raw = input as Partial<AICatalog.Catalog>;
	if( raw.schemaVersion !== KNOWN_CATALOG_SCHEMA_VERSION ) {
		return { ok : false };
	}
	if( typeof raw.revision !== 'number' || !Number.isInteger( raw.revision ) || raw.revision < 1 ) {
		return { ok : false };
	}
	if( !Array.isArray( raw.ais ) || raw.ais.length > CATALOG_AIS_MAX_COUNT ) {
		return { ok : false };
	}

	const seenIds = new Set<string>();
	const seenFamilies = new Set<string>();
	const ais:AICatalog.Vendor[] = [];
	for( const entry of raw.ais ) {
		if( !entry || typeof entry !== 'object' ) {
			return { ok : false };
		}
		const rawVendor = entry as Partial<AICatalog.Vendor>;
		const id = typeof rawVendor.id === 'string' ? rawVendor.id.trim() : '';
		const family = typeof rawVendor.family === 'string' ? rawVendor.family : '';
		if( id ) {
			if( seenIds.has( id ) ) {
				return { ok : false };
			}
			seenIds.add( id );
		}
		if( family ) {
			if( seenFamilies.has( family ) ) {
				return { ok : false };
			}
			seenFamilies.add( family );
		}

		const sanitized = sanitizeCatalogVendor( entry , options.production === true );
		if( sanitized === 'reject' ) {
			return { ok : false };
		}
		if( sanitized ) {
			ais.push( sanitized );
		}
	}

	/* 降级后仍须每 family 一行（含 custom）；两条坏 host 都会变成 custom，整份非法。 */
	const outFamilies = new Set<string>();
	for( const vendor of ais ) {
		if( outFamilies.has( vendor.family ) ) {
			return { ok : false };
		}
		outFamilies.add( vendor.family );
	}

	return {
		ok : true ,
		catalog : {
			schemaVersion : KNOWN_CATALOG_SCHEMA_VERSION ,
			revision : raw.revision ,
			description : typeof raw.description === 'string' ? raw.description : undefined ,
			ais,
		},
	};
};

const sanitizeCatalogVendor = (
	entry:unknown ,
	production:boolean,
):AICatalog.Vendor | null | 'reject' => {
	if( !entry || typeof entry !== 'object' ) {
		return 'reject';
	}
	const item = entry as Partial<AICatalog.Vendor>;
	if( typeof item.id !== 'string' || !isUuid( item.id ) ) {
		return 'reject';
	}

	const originalFamily = typeof item.family === 'string' ? item.family : '';
	if( !originalFamily ) {
		return 'reject';
	}
	if( production && originalFamily === 'dev-proxy-test' ) {
		return null;
	}
	if( !isKnownFamily( originalFamily ) ) {
		return 'reject';
	}

	let family:AI.AIFamily = originalFamily;
	const url = typeof item.url === 'string' ? item.url : '';
	if( family === 'custom' ) {
		if( url !== '' && !parseHttpUrl( url ) ) {
			return 'reject';
		}
	} else {
		const parsed = parseHttpUrl( url );
		if( !parsed ) {
			return 'reject';
		}
		const allowed = FAMILY_ALLOWED_HOSTS[family];
		if( allowed && !allowed.includes( parsed.hostname ) ) {
			family = 'custom';
		}
	}

	const region = parseVendorRegion( item.region );
	if( !region ) {
		return 'reject';
	}

	return {
		id : item.id ,
		family ,
		label : typeof item.label === 'string' && item.label ? item.label : family ,
		url ,
		region,
	};
};

const parseHttpUrl = ( url:string ):URL | null => {
	try {
		const parsed = new URL( url );
		if( parsed.protocol !== 'http:' && parsed.protocol !== 'https:' ) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
};

import { parseVendorRegion } from './ai-catalog-region.utility';
import type { AICatalog } from '#src/Types/AICatalog';
import type { AI } from '#src/Types/SettingsTypes/AI';
