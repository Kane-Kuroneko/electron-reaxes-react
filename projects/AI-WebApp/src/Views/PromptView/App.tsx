const { TextArea } = Input;

export const App = reaxper( () => {
	const {
		init ,
		addPrompt ,
		reorderPrompts,
	} = reaxel_PromptView();
	const { store } = reaxel_PromptView;
	const sensors = useSensors(
		useSensor( PointerSensor , {
			activationConstraint : {
				distance : 2,
			},
		} ),
	);
	
	useEffect( () => {
		void init();
	} , [] );
	
	const onDragEnd = (event:DragEndEvent) => {
		const { active , over } = event;
		if( !over || active.id === over.id ) {
			return;
		}
		reorderPrompts( String( active.id ) , String( over.id ) );
	};
	
	return <ConfigProvider
		theme={ {
			algorithm : store.appearance.theme === 'dark'
				? antdTheme.darkAlgorithm
				: antdTheme.defaultAlgorithm,
		} }
	>
		<main className="prompt-view-root">
			<header className="prompt-view-header">
				<div className="prompt-view-title">
					{ store.side === 'left' ? 'PromptViewLeft' : 'PromptViewRight' }
				</div>
				<Button
					type="primary"
					size="small"
					icon={ <PlusOutlined/> }
					onClick={ addPrompt }
				>New</Button>
			</header>
			<section className="prompt-view-body">
				{ store.status.loading ? <div className="prompt-view-loading"><Spin/></div> : null }
				{ !store.status.loading && store.items.length === 0 ? <div className="prompt-view-empty">
					<Button
						type="primary"
						icon={ <PlusOutlined/> }
						onClick={ addPrompt }
					>New Prompt</Button>
				</div> : null }
				{ !store.status.loading && store.items.length > 0 ? <DndContext
					sensors={ sensors }
					modifiers={ [ restrictToVerticalAxis ] }
					onDragEnd={ onDragEnd }
				>
					<SortableContext
						items={ store.items.map( item => item.id ) }
						strategy={ verticalListSortingStrategy }
					>
						<div className="prompt-card-list">
							{ store.items.map( ( item , index ) => <PromptCard
								key={ item.id }
								item={ item }
								index={ index }
							/> ) }
						</div>
					</SortableContext>
				</DndContext> : null }
			</section>
		</main>
	</ConfigProvider>;
} );

const PromptCard = reaxper( ( props:{
	item: PromptView.Item;
	index: number;
} ) => {
	const {
		persistNow ,
		setPromptText ,
		duplicatePrompt ,
		deletePrompt ,
		copyPrompt,
	} = reaxel_PromptView();
	const {
		attributes ,
		listeners ,
		setNodeRef ,
		transform ,
		transition ,
		isDragging,
	} = useSortable( {
		id : props.item.id,
	} );
	const style:React.CSSProperties = {
		transform : CSS.Translate.toString( transform ) ,
		transition ,
		...( isDragging ? { zIndex : 10 , position : 'relative' } : {} ),
	};
	
	return <div
		ref={ setNodeRef }
		style={ style }
	>
		<Card
			className="prompt-card"
			size="small"
			title={ <span className="prompt-card-title">Prompt { props.index + 1 }</span> }
		>
			<TextArea
				value={ props.item.content }
				autoSize={ { minRows : 5 , maxRows : 14 } }
				placeholder="Prompt text"
				onChange={ event => {
					setPromptText( props.item.id , event.target.value );
				} }
				onBlur={ () => {
					void persistNow();
				} }
			/>
			<div className="prompt-card-actions">
				<Tooltip title="Duplicate">
					<Button
						size="small"
						icon={ <PlusSquareOutlined/> }
						onClick={ () => duplicatePrompt( props.item.id ) }
					/>
				</Tooltip>
				<Tooltip title="Copy">
					<Button
						size="small"
						icon={ <CopyOutlined/> }
						onClick={ () => {
							void copyPrompt( props.item.id );
						} }
					/>
				</Tooltip>
				<Tooltip title="Delete">
					<Button
						size="small"
						danger
						icon={ <DeleteOutlined/> }
						onClick={ () => deletePrompt( props.item.id ) }
					/>
				</Tooltip>
				<Tooltip title="Drag to sort">
					<Button
						size="small"
						className="prompt-card-drag-handle"
						icon={ <HolderOutlined/> }
						{ ...attributes }
						{ ...listeners }
					/>
				</Tooltip>
			</div>
		</Card>
	</div>;
} );

import { reaxel_PromptView } from './reaxels/prompt-view';
import type { PromptView } from '#src/Types/PromptView';
import {
	CopyOutlined ,
	DeleteOutlined ,
	HolderOutlined ,
	PlusOutlined ,
	PlusSquareOutlined,
} from '@ant-design/icons';
import { DndContext , PointerSensor , useSensor , useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
	SortableContext ,
	useSortable ,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import React from 'react';
import { reaxper } from 'reaxes-react';
import {
	Button ,
	Card ,
	ConfigProvider ,
	Input ,
	Spin ,
	Tooltip ,
	theme as antdTheme,
} from 'antd';
import './index.less';
