/**
 * 供应商目录 region：ISO 国家码覆盖判定。
 * catalog.region = 该供应商服务可用/禁用地区，不是 GuidingView 的 domestic/international 分组
 *（那份仍在 ai-region.ts，按 family 分国内/国际产品，派生不出国家列表）。
 * 也不是 Google MakerSuite 资格门。
 * App 用本文件决定「出口国家码是否应显示本地阻断页」；国家列表只活在 JSON，不要在 TS 再维护一份。
 * 见 docs/feature-proposal--ai-catalog-source.md、docs/features/sensitive-region-access-blocking.md。
 */

export const EMPTY_VENDOR_REGION:AICatalog.VendorRegion = {
	available : [] ,
	forbidden : [],
};

const ISO_3166_1_ALPHA_2 = /^[A-Z]{2}$/;

/** 国家码收成大写；非字符串给空串。 */
export const normalizeCountryCode = ( value:unknown ):string => {
	return typeof value === 'string' ? value.trim().toUpperCase() : '';
};

/** 是否为大写 ISO 3166-1 alpha-2（两位字母）。 */
export const isIso3166Alpha2 = ( code:string ):boolean => {
	return ISO_3166_1_ALPHA_2.test( code );
};

/**
 * 缺省 / 空对象 → 不限制。形状不对或码不是大写 2 位 ISO → null（调用方应整份拒绝）。
 */
export const parseVendorRegion = ( input:unknown ):AICatalog.VendorRegion | null => {
	if( input == null ) {
		return { ...EMPTY_VENDOR_REGION };
	}
	if( typeof input !== 'object' || Array.isArray( input ) ) {
		return null;
	}
	const raw = input as Partial<AICatalog.VendorRegion> & Record<string , unknown>;
	const keys = Object.keys( raw );
	for( const key of keys ) {
		if( key !== 'available' && key !== 'forbidden' ) {
			return null;
		}
	}
	const available = parseIsoCodeList( raw.available );
	const forbidden = parseIsoCodeList( raw.forbidden );
	if( !available || !forbidden ) {
		return null;
	}
	return { available , forbidden };
};

export type VendorRegionBlockReason = 'forbidden' | 'not-available';

export type VendorRegionAccess = {
	blocked: boolean;
	reason: VendorRegionBlockReason | null;
};

/**
 * 已知出口国家码时，按供应商 region 决定是否阻断。
 * forbidden 优先；available 非空则只放行白名单；两数组都空不限制。
 * 国家码无效/空：本层不阻断（探测失败的 fail-closed 由敏感地区服务负责，不在这里发明）。
 */
export const evaluateVendorRegionAccess = (
	region:AICatalog.VendorRegion ,
	countryCode:string,
):VendorRegionAccess => {
	const code = normalizeCountryCode( countryCode );
	if( !code || !isIso3166Alpha2( code ) ) {
		return { blocked : false , reason : null };
	}
	if( region.forbidden.includes( code ) ) {
		return { blocked : true , reason : 'forbidden' };
	}
	if( region.available.length > 0 && !region.available.includes( code ) ) {
		return { blocked : true , reason : 'not-available' };
	}
	return { blocked : false , reason : null };
};

/** evaluateVendorRegionAccess 的布尔封装，给阻断页开关用。 */
export const isCountryBlockedByVendorRegion = (
	region:AICatalog.VendorRegion ,
	countryCode:string,
):boolean => {
	return evaluateVendorRegionAccess( region , countryCode ).blocked;
};

/** 种子页按供应商 UUID；用户加的同 family 第二页按 family 回查目录行。custom 无目录行。 */
export const findCatalogVendorForAI = (
	vendors:AICatalog.Vendor[] ,
	ai:Pick<AI.AIItem , 'id' | 'AI_family'>,
):AICatalog.Vendor | null => {
	const byId = vendors.find( vendor => vendor.id === ai.id );
	if( byId ) {
		return byId;
	}
	if( !ai.AI_family || ai.AI_family === 'custom' ) {
		return null;
	}
	return vendors.find( vendor => vendor.family === ai.AI_family ) ?? null;
};

/** 该页对应供应商的 region；查不到则不限制（空 available / forbidden）。 */
export const getVendorRegionForAI = (
	vendors:AICatalog.Vendor[] ,
	ai:Pick<AI.AIItem , 'id' | 'AI_family'>,
):AICatalog.VendorRegion => {
	return findCatalogVendorForAI( vendors , ai )?.region ?? EMPTY_VENDOR_REGION;
};

const countryCodesDiffer = ( left:string[] , right:string[] ):boolean => {
	if( left.length !== right.length ) {
		return true;
	}
	const rightSet = new Set( right );
	return left.some( code => !rightSet.has( code ) );
};

const countryCodesAdded = ( from:string[] , to:string[] ):string[] => {
	const fromSet = new Set( from );
	return to.filter( code => !fromSet.has( code ) );
};

/**
 * 当前目录 vs 远程目录：哪些供应商的可用/禁用地区变了。
 * 新出现的供应商不在这里（走 added）；只对齐同一 id。
 * 给 Settings 更新预览用，见 docs/features/ai-catalog-manual-update.md。
 */
export const diffVendorAvailability = (
	baseVendors:AICatalog.Vendor[] ,
	theirsVendors:AICatalog.Vendor[],
):AICatalog.CatalogAvailabilityChange[] => {
	const baseById = new Map( baseVendors.map( vendor => [ vendor.id , vendor ] as const ) );
	const changes:AICatalog.CatalogAvailabilityChange[] = [];
	for( const their of theirsVendors ) {
		const base = baseById.get( their.id );
		if( !base ) {
			continue;
		}
		const forbiddenAdded = countryCodesAdded( base.region.forbidden , their.region.forbidden );
		const forbiddenRemoved = countryCodesAdded( their.region.forbidden , base.region.forbidden );
		const availableChanged = countryCodesDiffer( base.region.available , their.region.available );
		if( !forbiddenAdded.length && !forbiddenRemoved.length && !availableChanged ) {
			continue;
		}
		changes.push( {
			id : their.id ,
			label : their.label ,
			forbiddenAdded ,
			forbiddenRemoved ,
			availableChanged ,
			availableAfter : their.region.available.slice(),
		} );
	}
	return changes;
};

/** 解析 ISO 码数组；缺省当空列表，形状不对返回 null。重复码去重保留先出现的。 */
const parseIsoCodeList = ( value:unknown ):string[] | null => {
	if( value == null ) {
		return [];
	}
	if( !Array.isArray( value ) ) {
		return null;
	}
	const codes:string[] = [];
	const seen = new Set<string>();
	for( const entry of value ) {
		if( typeof entry !== 'string' ) {
			return null;
		}
		const code = normalizeCountryCode( entry );
		if( !isIso3166Alpha2( code ) ) {
			return null;
		}
		if( seen.has( code ) ) {
			continue;
		}
		seen.add( code );
		codes.push( code );
	}
	return codes;
};

import type { AICatalog } from '#src/Types/AICatalog';
import type { AI } from '#src/Types/SettingsTypes/AI';
