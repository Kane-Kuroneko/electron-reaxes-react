/**
 * @description 将主进程推送的完整 structure 分区为左区菜单与中区 Prev/Brand/Next 导航。
 */

export type MenuBarEntry = {
	item : MenuView.TopLevelItem;
	originalIndex : number;
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

	structure.forEach( ( item , originalIndex ) => {
		if( item.id === 'prev-instantiated' ) {
			prevEntry = { item , originalIndex };
			return;
		}
		if( item.id === 'next-instantiated' ) {
			nextEntry = { item , originalIndex };
			return;
		}
		leftMenuEntries.push( { item , originalIndex } );
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
