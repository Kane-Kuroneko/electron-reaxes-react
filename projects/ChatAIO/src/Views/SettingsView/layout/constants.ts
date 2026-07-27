/**
 * Settings 主内容区布局契约：
 * - 默认：`.settings-panel` 自身纵向滚动（General / Network / About 等多段堆叠页）
 * - fill：面板不滚动，由内部 section / table / markdown 占满剩余高度并内部滚动
 */
export const SETTINGS_FILL_CONTENT_MENUS = new Set( [
	'mngeai' ,
	'version' ,
] );

/** SettingsView 内 Modal 统一：限高 + body 内滚动，避免顶出视口 */
export const SETTINGS_MODAL_CONFIG = {
	centered : true ,
	styles : {
		body : {
			maxHeight : 'calc(100vh - 160px)' ,
			overflowY : 'auto' as const ,
		} ,
	} ,
};
