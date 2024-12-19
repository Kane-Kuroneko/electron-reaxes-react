export const Row: React.FC<Readonly<RowProps>> = reaxper( ( props ) => {
	const { attributes , listeners , setNodeRef , transform , transition , isDragging } = useSortable( {
		id : props['data-row-key'] ,
	} );
	
	const style: React.CSSProperties = {
		...props.style ,
		transform : CSS.Translate.toString( transform ) ,
		transition ,
		// cursor : 'move' ,
		...(
			isDragging ? { position : 'relative' , zIndex : 9999 } : {}
		) ,
	};
	
	return <tr
		{ ...props }
		ref = { setNodeRef }
		style = { style }
		{ ...attributes }
	/>;
} );


interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
	'data-row-key': string;
}

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
