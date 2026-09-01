/**
 * catalog_update 的 in-flight 真相（checking / applying）。
 * 任一为 true：check 与 apply 都不得再发 IPC。组件不要用 useRef/useState 做第二套锁。
 * 见 docs/features/ai-catalog-manual-update.md
 */
export const isCatalogUpdateInFlight = (
	catalogUpdate:{ checking?:boolean; applying?:boolean },
):boolean => {
	return catalogUpdate.checking === true || catalogUpdate.applying === true;
};

/**
 * Settings 侧栏 / 页脚在目录检查或预览未结束前锁住。
 * 真相在 catalog_update store，不要靠组件生命周期。
 */
export const shouldLockSettingsChromeForCatalogUpdate = (
	catalogUpdate:{
		checking?:boolean;
		applying?:boolean;
		preview?:unknown | null;
	},
):boolean => {
	return isCatalogUpdateInFlight( catalogUpdate ) || catalogUpdate.preview != null;
};
