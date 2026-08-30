/**
 * 供应商目录 vs 用户运行时整表。两套形状，不要混。
 * Catalog.ais 是瘦供应商行（id+family+label+url+region），不是 AI.AIItem[]。
 * UserAIs.ais 才是页实例整表。region 不进 AIItem，运行时按 id/family 回查目录行。
 * 见 docs/feature-proposal--ai-catalog-source.md。
 */
export namespace AICatalog {
	/**
	 * 该供应商服务覆盖（ISO 3166-1 alpha-2，大写）。
	 * available 非空 = 仅这些地区可用；空 = 不按白名单限制。
	 * forbidden 优先：即使出现在 available 里也禁用。
	 * 两数组都空 = 不限制。不是 GuidingView 的 domestic/international 分组，也不是 Google MakerSuite 资格门。
	 */
	export type VendorRegion = {
		available: string[];
		forbidden: string[];
	};

	/**
	 * 扁平供应商 / family 目录行。id 是供应商 UUID（官方种子页可复用此 id）。
	 * 不含 disabled / proxy / preload / url_override（那些是实例字段，由 App 内置策略补）。
	 */
	export type Vendor = {
		id: string;
		family: AI.AIFamily;
		label: string;
		url: string;
		region: VendorRegion;
	};

	/** bundled `default-ais.json` 与 cache `catalog-ais.json`。每 family 至多一行供应商。 */
	export type Catalog = {
		schemaVersion: number;
		revision: number;
		description?: string;
		ais: Vendor[];
	};

	/** userData/user-ais.json：整表 + deletedIds，不是 delta */
	export type UserAIs = {
		/* 旧 user-ais.json 可能仍有 semver；读到忽略，写入不再抄 catalog */
		version?: string;
		description?: string;
		ais: AI.AIItem[];
		deletedIds?: string[];
	};

	/** validateCatalog 选项。production 时丢掉误入的 dev-proxy-test。 */
	export type ValidateOptions = {
		/** 生产构建丢掉误入目录的 dev-proxy-test 行；该 family 只由 App 在 dev() 注入 */
		production?: boolean;
	};

	/** 失败不带文案：调用方只关心能不能用这份目录。 */
	export type ValidateResult =
		| {
			ok: true;
			catalog: Catalog;
		}
		| {
			ok: false;
		};

	/** 目录能改的种子字段：官方 URL / 展示名。disabled 不在目录上，不参与 merge。 */
	export type MergeField = 'url' | 'label';

	/** 为什么这一行没被目录更新改掉。 */
	export type MergeSkipReason = 'user-changed' | 'url-override' | 'custom-id';

	/** Settings 预览用：added/updated/skipped/dropped + 确认后可写盘的 nextAis。 */
	export type MergePreview = {
		added: AI.AIItem[];
		updated: {
			before: AI.AIItem;
			after: AI.AIItem;
			fields: MergeField[];
		}[];
		skipped: {
			id: string;
			reason: MergeSkipReason;
		}[];
		catalogDropped: {
			id: string;
		}[];
		nextAis: AI.AIItem[];
		deletedIds: string[];
	};
}

import type { AI } from '#src/Types/SettingsTypes/AI';
