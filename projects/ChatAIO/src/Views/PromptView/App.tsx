const { TextArea } = Input;

export const App = reaxper( () => {
	const {
		init ,
		addPrompt ,
		reorderPrompts ,
	} = reaxel_PromptView();

	const closePromptView = () => {
		api.closePromptView( store.side );
	};
	const { store } = reaxel_PromptView;
	const resolvedTheme = resolveThemePreference( store.appearance.theme , store.environment.systemTheme );
	const sensors = useSensors(
		useSensor( PointerSensor , {
			activationConstraint : {
				distance : 2 ,
			} ,
		} ) ,
	);

	useEffect( () => {
		void init();
	} , [] );

	const onDragEnd = ( event: DragEndEvent ) => {
		const {
			active ,
			over,
		} = event;
		if( !over || active.id === over.id ) {
			return;
		}
		reorderPrompts( String( active.id ) , String( over.id ) );
	};

	return <ConfigProvider
		theme={ {
			algorithm : resolvedTheme === 'dark'
				? antdTheme.darkAlgorithm
				: antdTheme.defaultAlgorithm ,
		} }
	>
		<main className="prompt-view-root">
			<header className="prompt-view-header">
				<div className="prompt-view-heading">
					<div className="prompt-view-kicker">
						<FileText size={ 14 } />
						<span><I18n>Prompt Shelf</I18n></span>
					</div>
					<div className="prompt-view-title-row">
						<h1><I18n>Prompts</I18n></h1>
						<span className="prompt-view-side-pill">
							<I18n>{ store.side === 'left' ? 'Left' : 'Right' }</I18n>
						</span>
					</div>
				</div>
				<div className="prompt-view-header-actions">
					<Tooltip title={ <I18n>New Prompt</I18n> }>
						<Button
							type="primary"
							className="prompt-view-add-button"
							shape="circle"
							icon={ <Plus size={ 18 } /> }
							aria-label={ i18n( 'New Prompt' ) }
							onClick={ addPrompt }
						/>
					</Tooltip>
					<Tooltip title={ <I18n>Close</I18n> }>
						<Button
							type="text"
							className="prompt-view-close-button"
							shape="circle"
							icon={ <X size={ 16 } /> }
							aria-label={ i18n( 'Close' ) }
							onClick={ closePromptView }
						/>
					</Tooltip>
				</div>
			</header>
			<div className="prompt-view-statusline">
				<span>{ store.items.length } <I18n>prompts</I18n></span>
				<span className={ `prompt-view-save-state ${ store.status.saving ? 'is-saving' : '' }` }>
					{ store.status.saving
						? <Loader2
							size={ 13 }
							className="prompt-spin"
						/>
						: <CircleCheck size={ 13 } />
					}
					<I18n>{ store.status.saving ? 'Saving' : 'Saved' }</I18n>
				</span>
			</div>
			<section className="prompt-view-body">
				{ store.status.error ? <Alert
					className="prompt-view-error"
					type="error"
					showIcon
					message={ store.status.error }
				/> : null }
				{ store.status.loading ? <div className="prompt-view-loading"><Spin /></div> : null }
				{ !store.status.loading && store.items.length === 0 ? <div className="prompt-view-empty">
					<div className="prompt-view-empty-mark"><FileText size={ 24 } /></div>
					<div className="prompt-view-empty-title"><I18n>No prompts</I18n></div>
					<Button
						type="primary"
						icon={ <Plus size={ 16 } /> }
						onClick={ addPrompt }
					><I18n>New Prompt</I18n></Button>
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

const PromptCard = reaxper( ( props: {
	item: PromptView.Item;
	index: number;
} ) => {
	const {
		persistNow ,
		setPromptText ,
		duplicatePrompt ,
		deletePrompt ,
		copyPrompt ,
	} = reaxel_PromptView();
	const {
		attributes ,
		listeners ,
		setNodeRef ,
		transform ,
		transition ,
		isDragging ,
	} = useSortable( {
		id : props.item.id ,
	} );
	const style: React.CSSProperties = {
		transform : CSS.Translate.toString( transform ) ,
		transition ,
		...(
			isDragging ? {
				zIndex : 10 ,
				position : 'relative',
			} : {}
		) ,
	};
	const isEmpty = props.item.content.trim().length === 0;

	return <article
		ref={ setNodeRef }
		style={ style }
		className={ `prompt-card ${ isDragging ? 'is-dragging' : '' }` }
	>
		<div className="prompt-card-topbar">
			<div className="prompt-card-identity">
				<Tooltip title={ <I18n>Drag to sort</I18n> }>
					<Button
						size="small"
						type="text"
						className="prompt-card-icon-button prompt-card-drag-handle"
						icon={ <Grip size={ 15 } /> }
						aria-label={ i18n( 'Drag to sort' ) }
						{ ...attributes }
						{ ...listeners }
					/>
				</Tooltip>
				<span className="prompt-card-title">{ i18n( 'Prompt' ) } { String( props.index + 1 ).padStart( 2 , '0' ) }</span>
			</div>
			<div className="prompt-card-actions">
				<Tooltip title={ <I18n>Duplicate</I18n> }>
					<Button
						size="small"
						type="text"
						className="prompt-card-icon-button"
						icon={ <CopyPlus size={ 15 } /> }
						aria-label={ i18n( 'Duplicate' ) }
						onClick={ () => duplicatePrompt( props.item.id ) }
					/>
				</Tooltip>
				<Tooltip title={ <I18n>Copy</I18n> }>
					<Button
						size="small"
						type="text"
						className="prompt-card-icon-button"
						icon={ <ClipboardCopy size={ 15 } /> }
						aria-label={ i18n( 'Copy' ) }
						onClick={ () => {
							void copyPrompt( props.item.id );
						} }
					/>
				</Tooltip>
				<Tooltip title={ <I18n>Delete</I18n> }>
					<Button
						size="small"
						type="text"
						danger
						className="prompt-card-icon-button"
						icon={ <Trash2 size={ 15 } /> }
						aria-label={ i18n( 'Delete' ) }
						onClick={ () => deletePrompt( props.item.id ) }
					/>
				</Tooltip>
			</div>
		</div>
		<div className="prompt-composer">
			<TextArea
				className="prompt-card-textarea"
				value={ props.item.content }
				autoSize={ {
					minRows : 5 ,
					maxRows : 14,
				} }
				placeholder={ i18n( 'Prompt text' ) }
				onChange={ event => {
					setPromptText( props.item.id , event.target.value );
				} }
				onBlur={ () => {
					void persistNow();
				} }
			/>
			<div className="prompt-composer-footer">
				<span className={ isEmpty ? 'is-empty' : '' }>
					{ isEmpty ? <I18n>Empty</I18n> : <>
						{ props.item.content.length } <I18n>chars</I18n>
					</> }
				</span>
			</div>
		</div>
	</article>;
} );

import { reaxel_PromptView } from './reaxels/prompt-view';
import {
	I18n ,
	i18n,
} from './reaxels/exports';
import { resolveThemePreference } from '#src/shared/appearance';
import type { PromptView } from '#src/Types/PromptView';
import {
	CircleCheck ,
	ClipboardCopy ,
	CopyPlus ,
	FileText ,
	Grip ,
	Loader2 ,
	Plus ,
	Trash2 ,
	X ,
} from 'lucide-react';
import {
	DndContext ,
	PointerSensor ,
	useSensor ,
	useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
	SortableContext ,
	useSortable ,
	verticalListSortingStrategy ,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import React from 'react';
import { reaxper } from 'reaxes-react';
import {
	Alert ,
	Button ,
	ConfigProvider ,
	Input ,
	Spin ,
	Tooltip ,
	theme as antdTheme ,
} from 'antd';
import './index.less';
