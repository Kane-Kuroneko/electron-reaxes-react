/**
 * @description 将主进程推送的完整 structure 分区为左区菜单与中区 Prev/Brand/Next 导航。
 * 分区结果以菜单 id 作为唯一标识，视图不依赖数组下标。
 */

export type MenuBarEntry = {
	item : MenuView.TopLevelItem;
};

export type CenterNavPartition = {
	prev : MenuBarEntry;
	next : MenuBarEntry;
};

export type StructurePartition = {
	leftMenuEntries : MenuBarEntry[];
	centerNav : CenterNavPartition | null;
};

export const partitionStructure = ( structure : MenuView.Structure ) : StructurePartition => {
	const leftMenuEntries : MenuBarEntry[] = [];
	let prevEntry : MenuBarEntry | null = null;
	let nextEntry : MenuBarEntry | null = null;

	structure.forEach( ( item ) => {
		if( item.id === 'prev-instantiated' ) {
			prevEntry = { item };
			return;
		}
		if( item.id === 'next-instantiated' ) {
			nextEntry = { item };
			return;
		}
		leftMenuEntries.push( { item } );
	} );

	const centerNav = prevEntry && nextEntry
		? { prev : prevEntry , next : nextEntry }
		: null;

	return {
		leftMenuEntries ,
		centerNav ,
	};
};


import type { MenuView } from '#src/Types/MenuView';
