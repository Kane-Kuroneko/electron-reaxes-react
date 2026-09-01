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

	/** 三路 merge 的完整结果。nextAis 只给 main 写盘，不要下发 renderer。 */
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

	/**
	 * 某家 AI 在哪些地区能用发生了变化。国家码是 ISO alpha-2，UI 再翻成地名。
	 * 不把完整 region 对象下发。
	 */
	export type CatalogAvailabilityChange = {
		id: string;
		label: string;
		forbiddenAdded: string[];
		forbiddenRemoved: string[];
		/** available 白名单相对当前目录有没有变 */
		availableChanged: boolean;
		/** 变了之后的白名单；空 = 不再按白名单限制（forbidden 仍生效） */
		availableAfter: string[];
	};

	/** IPC / Modal 预览一行：只有 id、名称、网址，不要整份 AIItem（proxy 等）。 */
	export type CatalogPagePreview = {
		id: string;
		label: string;
		url: string;
	};

	/**
	 * Settings Modal 用的 diff：没有 nextAis / deletedIds，也没有目录正文。
	 * added / updated 是瘦预览，不是运行时页实例。
	 */
	export type CatalogUpdateDiff = {
		added: CatalogPagePreview[];
		updated: {
			id: string;
			before: CatalogPagePreview;
			after: CatalogPagePreview;
			fields: MergeField[];
		}[];
		skipped: MergePreview['skipped'];
		catalogDropped: MergePreview['catalogDropped'];
		availability: CatalogAvailabilityChange[];
	};

	/**
	 * Settings 手动检查更新（批次 5）。
	 * 远程是 ChatAIO-Releases tag `ai-catalog` 的 Release 资产，不是仓目录拷贝。
	 */
	export type CatalogUpdateStatus = 'up-to-date' | 'available' | 'error';

	export type CatalogUpdateErrorCode =
		| 'network'
		| 'forbidden-url'
		| 'verify-failed'
		| 'invalid-catalog'
		| 'schema-too-new'
		| 'no-pending';

	/** check-ai-catalog-update：只读。pending 在 main；失败不清上一份成功的 pending。 */
	export type CatalogUpdateCheckResult = {
		status: CatalogUpdateStatus;
		bundledRevision: number;
		cacheRevision: number | null;
		remoteRevision?: number;
		diff?: CatalogUpdateDiff;
		errorCode?: CatalogUpdateErrorCode;
		error?: string;
	};

	/** apply-ai-catalog-update：必须对得上这次 check 留下的 pending。settings 由 IPC 层附带。 */
	export type CatalogUpdateApplyResult = {
		success: boolean;
		errorCode?: CatalogUpdateErrorCode;
		error?: string;
		/** 写盘已成功，但 AI 页/菜单同步失败，必须重启才能对齐界面。 */
		restartRequired?: boolean;
	};
}

import type { AI } from '#src/Types/SettingsTypes/AI';
