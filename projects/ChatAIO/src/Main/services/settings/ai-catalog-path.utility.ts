/**
 * Bundled 供应商目录路径（瘦 JSON：id+family+label+url+region，不是 AIItem 种子袋）。
 * packaged → `resources/statics/ai-catalog/default-ais.json`
 * dev → 工程根 `statics/ai-catalog/default-ais.json`
 * 见 docs/feature-proposal--ai-catalog-source.md（方向纠偏；批次 1 路径仍对）。
 */

export const BUNDLED_AI_CATALOG_SCHEMA_VERSION = 1;

export const resolveBundledCatalogPath = ():string => {
	return path.join( getStaticsDir() , 'ai-catalog' , 'default-ais.json' );
};

import * as path from 'node:path';
import { getStaticsDir } from '#main/services/app-icons';
