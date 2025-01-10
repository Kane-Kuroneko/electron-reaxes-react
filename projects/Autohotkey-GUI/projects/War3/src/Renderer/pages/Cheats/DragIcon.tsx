export const DragIcon = reaxper( ( props ) => {
	const { attributes , listeners , setNodeRef , transform , transition , isDragging } = useSortable( {
		id : props.k ,
	} );
	return <SVG_Drag
		{ ...listeners }
		style = { { width : 45 , height : 45 , display : "flex" , margin : '0 auto' , cursor : 'move' } }
	/>;
} );

import { SVG_Drag } from '#renderer/pure-components/SVG/Drag.component';
import { useSortable } from '@dnd-kit/sortable';
