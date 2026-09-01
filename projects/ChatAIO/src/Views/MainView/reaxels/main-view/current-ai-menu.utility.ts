/**
 * 中区 Current AI badge 的虚拟菜单 id 与 submenu 过滤。
 * badge 不在左区 structure 里，点击后复用 Switch AI 的 AI 项，去掉 Prev/Next 等 footer。
 * 设计：docs/features/menubar-current-ai-dropdown.md
 */

export const CURRENT_AI_MENU_ID = 'current-ai';

export const isCurrentAiMenuItem = ( item : MenuView.Item ) => {
	return item.action === 'switch-ai' || item.id === 'no-ai';
};

export const getCurrentAiMenuItems = ( structure : MenuView.Structure ) : MenuView.Item[] => {
	const switchAi = structure.find( item => item.id === 'switch-ai' );
	if( !switchAi?.submenu?.length ) {
		return [];
	}
	return switchAi.submenu.filter( isCurrentAiMenuItem );
};


import type { MenuView } from '#src/Types/MenuView';
