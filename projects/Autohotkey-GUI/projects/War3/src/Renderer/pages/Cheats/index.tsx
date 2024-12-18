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
	
	const addI18nToColumns = ( columns: TableColumnType<DataType>[] ) => {
		return columns.map( ( column ) => {
			return {
				...column ,
				title : i18n( column.title as string ) ,
			};
		} );
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
							body : { row : Row } ,
							
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

const columns: TableColumnType<DataType>[] = [
	{
		key : 'description' ,
		dataIndex : 'description' ,
		title : 'Description' ,
		render( text , record , index ) {
			console.log(text);
			return <span style = { { display : "flex" } }><I18n>{ text }</I18n></span>;
		} ,
	} ,
	{
		key : 'code' ,
		dataIndex : 'code' ,
		className : 'selectable' ,
		title : 'Cheat Code' ,
		width : '25%' ,
		render( value , record , index ) {
			
			return <b style = { { wordBreak : 'keep-all' , whiteSpace : 'nowrap' } }>{ value }</b>;
		} ,
		
	} ,
	{
		key : 'operations' ,
		dataIndex : 'operations' ,
		title : 'Operations' ,
		width : 200 ,
		render( text , record , index ) {
			return <div>
				<Button type = "primary"><I18n>Copy</I18n></Button>
			</div>;
		} ,
	} ,
	{
		key : 'dnd' ,
		dataIndex : null ,
		title : 'Drag to Sort' ,
		width : 120 ,
		render( text , record , index ) {
			return <DragSVG style = { { width : 45 , height : 45 , display : "flex" , margin : '0 auto' } } />;
		} ,
	} ,
];


const Row: React.FC<Readonly<RowProps>> = reaxper( ( props ) => {
	const { attributes , listeners , setNodeRef , transform , transition , isDragging } = useSortable( {
		id : props['data-row-key'] ,
	} );
	
	const style: React.CSSProperties = {
		...props.style ,
		transform : CSS.Translate.toString( transform ) ,
		transition ,
		cursor : 'move' ,
		...(
			isDragging ? { position : 'relative' , zIndex : 9999 } : {}
		) ,
	};
	
	return <tr { ...props } ref = { setNodeRef }
		style = { style } { ...attributes } { ...listeners } />;
} );

const shallowCopyDepth2 = ( arr: any[] ) => {
	return arr.map( ( obj ) => {
		return { ...obj };
	} );
};

interface DataType {
	key: string;
	code: string;
	description: string;
	children?: DataType[],
	// _zh_desc?:string,
}


interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
	'data-row-key': string;
}

import {MinusSquareOutlined,PlusSquareOutlined} from '@ant-design/icons';
import { DragSVG } from '#project/src/Renderer/pure-components/SVG/Drag.component';
import { useforceUpdate } from '#generic/utils/src/hooks/useForceUpdate';
import { reaxel_CheatCodes } from '#reaxels/cheat-codes.renderer';
import { MainConententAreaContainer } from '#project/src/Renderer/pure-components/Main-Content-Area-Container';
import { Button , Table , TableColumnType } from 'antd';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext , PointerSensor , useSensor , useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove , SortableContext , useSortable , verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as less from './style.module.less';
