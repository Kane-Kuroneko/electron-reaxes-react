/**
 * Bundled 供应商目录路径（瘦 JSON：id+family+label+url+region，不是 AIItem 种子袋）。
 * packaged → `resources/statics/ai-catalog/default-ais.json`（旁路 ed25519.pub / default-ais.json.sig）
 * dev → 工程根 `statics/ai-catalog/`
 * 见 docs/feature-proposal--ai-catalog-source.md。
 */

export const BUNDLED_AI_CATALOG_SCHEMA_VERSION = 1;

/** 安装包 / 开发态 bundled 瘦目录 JSON 的绝对路径。 */
export const resolveBundledCatalogPath = ():string => {
	return path.join( getStaticsDir() , 'ai-catalog' , 'default-ais.json' );
};

/** 打进安装包的 Ed25519 公钥路径。私钥不在这里。 */
export const resolveBundledCatalogPublicKeyPath = ():string => {
	return path.join( getStaticsDir() , 'ai-catalog' , 'ed25519.pub' );
};

/** bundled 目录旁路签名文件路径（JSON 原文的 raw Ed25519，base64 一行）。 */
export const resolveBundledCatalogSignaturePath = ():string => {
	return path.join( getStaticsDir() , 'ai-catalog' , 'default-ais.json.sig' );
};

import * as path from 'node:path';
import { getStaticsDir } from '#main/services/app-icons';
