export const Cheats = reaxper( () => {
	const { cheatCodes_Store , dragToSort } = reaxel_CheatCodes();
	const forceUpdate = useforceUpdate();
	
	const sensors = useSensors(
		useSensor( PointerSensor , {
			activationConstraint : {
				// https://docs.dndkit.com/api-documentation/sensors/pointer#activation-constraints
				distance : 1 ,
			} ,
		} ) ,
	);
	
	const onDragEnd = ( { active , over }: DragEndEvent ) => {
		if( active.id !== over?.id ) {
			const originalCopy = [ ...cheatCodes_Store.cheatCodesData ];
			const activeIndex = originalCopy.findIndex( ( i ) => i.key === active.id );
			const overIndex = originalCopy.findIndex( ( i ) => i.key === over?.id );
			dragToSort( arrayMove( originalCopy , activeIndex , overIndex ) );
			forceUpdate();
		}
	};
	
	return <MainConententAreaContainer>
		<div
			className = { less.cheatsTableContainer }
		>
			<DndContext
				sensors = { sensors }
				modifiers = { [ restrictToVerticalAxis ] }
				onDragEnd = { onDragEnd }
			>
				<SortableContext
					items = { cheatCodes_Store.cheatCodesData.map( ( i ) => i.key ) }
					strategy = { verticalListSortingStrategy }
				>
					<Table<DataType>
						components = { {
							body : { row : Row }
						} }
						rowKey = "key"
						columns = { addI18nToColumns( columns ) }
						dataSource = { cheatCodes_Store.cheatCodesData }
						pagination = { false }
						scroll = { {
							y : 680 ,
						} }
					/>
				</SortableContext>
			</DndContext>
		</div>
	</MainConententAreaContainer>;
} );

const addI18nToColumns = ( columns: TableColumnType<DataType>[] ) => {
	return columns.map( ( column ) => {
		return {
			...column ,
			title : i18n( column.title as string ) ,
		};
	} );
};

import { Row } from './Row';
import { columns } from './columns';
import { reaxel_CheatCodes } from '#reaxels/cheat-codes.renderer';
import { MainConententAreaContainer } from '#project/src/Renderer/pure-components/Main-Content-Area-Container';
import { useforceUpdate } from '#generic/utils/src/hooks/useForceUpdate';
import { Table , TableColumnType } from 'antd';
import { DndContext , PointerSensor , useSensor , useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove , SortableContext , verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { DataType } from './types';
import type { DragEndEvent } from '@dnd-kit/core';
import * as less from './style.module.less';