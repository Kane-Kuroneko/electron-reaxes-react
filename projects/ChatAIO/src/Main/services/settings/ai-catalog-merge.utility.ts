/**
 * 供应商目录与用户实例整表的纯函数 merge。不进 renderer，不监听文件。
 * 目录行先映射成种子实例，再按供应商 UUID 对齐 user 表里同一 id 的官方页。
 * 用户自己加的同 family 新 id 不是种子页，目录更新碰不到。
 * disabled / proxy / preload 不是目录字段，三路 merge 不改它们。
 * 见 docs/feature-proposal--ai-catalog-source.md（方向纠偏后的批次 3）。
 */

const CATALOG_UPDATE_FIELDS = [ 'url' , 'label' ] as const;

export const composeEffectiveAIs = (
	catalogVendors:AICatalog.Vendor[] ,
	user:AICatalog.UserAIs | null,
):AI.AIItem[] => {
	const catalogAis = catalogVendors.map( vendor => vendorToAIItem( vendor ) );
	if( !user ) {
		return catalogAis;
	}
	const userAIIds = new Set( user.ais.map( ai => ai.id ) );
	const deletedIds = new Set( user.deletedIds || [] );
	const effectiveAIs = [ ...user.ais ];
	for( const catalogAI of catalogAis ) {
		if( !userAIIds.has( catalogAI.id ) && !deletedIds.has( catalogAI.id ) ) {
			effectiveAIs.push( catalogAI );
		}
	}
	return effectiveAIs;
};

export const selectRuntimeCatalog = (
	bundled:AICatalog.Catalog ,
	cache:AICatalog.Catalog | null,
):AICatalog.Catalog => {
	if( cache && cache.revision >= bundled.revision ) {
		return cache;
	}
	return bundled;
};

export const previewCatalogMerge = (
	baseVendors:AICatalog.Vendor[] ,
	theirsVendors:AICatalog.Vendor[] ,
	ours:AI.AIItem[] ,
	deletedIds:string[] = [],
):AICatalog.MergePreview => {
	const baseById = new Map( baseVendors.map( vendor => [ vendor.id , vendor ] as const ) );
	const theirsById = new Map( theirsVendors.map( vendor => [ vendor.id , vendor ] as const ) );
	const oursById = new Map( ours.map( ai => [ ai.id , ai ] as const ) );
	const deleted = new Set( deletedIds );

	const added:AI.AIItem[] = [];
	const updated:AICatalog.MergePreview['updated'] = [];
	const skipped:AICatalog.MergePreview['skipped'] = [];
	const catalogDropped:AICatalog.MergePreview['catalogDropped'] = [];
	const droppedIds = new Set<string>();
	const nextAis:AI.AIItem[] = [];

	for( const our of ours ) {
		const their = theirsById.get( our.id );
		const baseVendor = baseById.get( our.id );

		if( !their ) {
			if( baseVendor && !droppedIds.has( our.id ) ) {
				catalogDropped.push( { id : our.id } );
				droppedIds.add( our.id );
			}
			nextAis.push( our );
			continue;
		}

		if( our.id.startsWith( 'custom-' ) ) {
			skipped.push( { id : our.id , reason : 'custom-id' } );
			nextAis.push( our );
			continue;
		}

		if( our.url_override ) {
			skipped.push( { id : our.id , reason : 'url-override' } );
			nextAis.push( our );
			continue;
		}

		const next:AI.AIItem = { ...our };
		const fields:AICatalog.MergeField[] = [];
		let userChanged = false;

		for( const field of CATALOG_UPDATE_FIELDS ) {
			const oursVal = our[field];
			const baseVal = baseVendor?.[field];
			const theirsVal = their[field];
			if( oursVal === baseVal ) {
				if( theirsVal !== oursVal ) {
					if( field === 'url' ) {
						next.url = theirsVal ?? '';
					} else {
						next.label = theirsVal ?? next.label;
					}
					fields.push( field );
				}
			} else {
				userChanged = true;
			}
		}

		if( fields.length ) {
			updated.push( { before : our , after : next , fields } );
			nextAis.push( next );
		} else {
			if( userChanged ) {
				skipped.push( { id : our.id , reason : 'user-changed' } );
			}
			nextAis.push( our );
		}
	}

	for( const their of theirsVendors ) {
		if( oursById.has( their.id ) || deleted.has( their.id ) ) {
			continue;
		}
		const mapped = vendorToAIItem( their );
		added.push( mapped );
		nextAis.push( mapped );
	}

	for( const baseVendor of baseVendors ) {
		if( !theirsById.has( baseVendor.id ) && !droppedIds.has( baseVendor.id ) ) {
			catalogDropped.push( { id : baseVendor.id } );
			droppedIds.add( baseVendor.id );
		}
	}

	return {
		added ,
		updated ,
		skipped ,
		catalogDropped ,
		nextAis ,
		deletedIds : deletedIds.slice(),
	};
};

export const applyCatalogMerge = (
	baseVendors:AICatalog.Vendor[] ,
	theirsVendors:AICatalog.Vendor[] ,
	ours:AI.AIItem[] ,
	deletedIds:string[] = [],
):AICatalog.UserAIs => {
	const preview = previewCatalogMerge( baseVendors , theirsVendors , ours , deletedIds );
	return {
		ais : preview.nextAis ,
		deletedIds : preview.deletedIds,
	};
};

import { vendorToAIItem } from './ai-catalog-builtin.utility';
import type { AICatalog } from '#src/Types/AICatalog';
import type { AI } from '#src/Types/SettingsTypes/AI';
