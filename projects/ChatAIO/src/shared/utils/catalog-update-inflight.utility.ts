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
 * Settings 侧栏 / 页脚只在「有预览 Modal」或 applying 时锁住。
 * checking 单独不得锁 chrome：检查中没有可取消的 Modal；fetch/session 清理若卡住，
 * 把 tab 和页脚一起冻住就是无限 loading。按钮自己的 spinner 已经表示 in-flight。
 * 见 docs/features/ai-catalog-manual-update.md
 */
export const shouldLockSettingsChromeForCatalogUpdate = (
	catalogUpdate:{
		checking?:boolean;
		applying?:boolean;
		preview?:unknown | null;
	},
):boolean => {
	return catalogUpdate.applying === true || catalogUpdate.preview != null;
};
