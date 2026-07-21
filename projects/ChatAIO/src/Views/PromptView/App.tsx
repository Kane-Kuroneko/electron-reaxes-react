const { TextArea } = Input;

export const App = reaxper( () => {
	const {
		init ,
		addPrompt ,
		reorderPrompts ,
		deletePrompt ,
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

	const hasItems = store.items.length > 0;

	return <ConfigProvider
		theme={ {
			algorithm : resolvedTheme === 'dark'
				? antdTheme.darkAlgorithm
				: antdTheme.defaultAlgorithm ,
		} }
	>
		<main className="prompt-view-root">
			{/* ═══ Header：左侧模块名 + 侧标识，右侧仅关闭按钮 ═══ */}
			<header className="prompt-view-header">
				<div className="prompt-view-heading">
					<FileText size={ 14 } />
					<span className="prompt-view-title"><I18n>Prompt Shelf</I18n></span>
					<span className="prompt-view-side-pill">
						<I18n>{ store.side === 'left' ? 'Left' : 'Right' }</I18n>
					</span>
				</div>
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
			</header>

			{/* ═══ Toolbar：状态信息 + 新建按钮（从 header 移至此）═══ */}
			<div className="prompt-view-toolbar">
				<div className="prompt-view-status">
					<span className="prompt-view-count">{ store.items.length } <I18n>prompts</I18n></span>
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
			</div>

			{/* ═══ Body：卡片列表（SortableContext 结构不变）═══ */}
			<section className="prompt-view-body">
				{ store.status.error ? <Alert
					className="prompt-view-error"
					type="error"
					showIcon
					message={ store.status.error }
				/> : null }
				{ store.status.loading ? <div className="prompt-view-loading"><Spin /></div> : null }
				{ !store.status.loading && !hasItems ? <div className="prompt-view-empty">
					<div className="prompt-view-empty-mark"><FileText size={ 24 } /></div>
					<div className="prompt-view-empty-title"><I18n>No prompts</I18n></div>
					<Button
						type="primary"
						icon={ <Plus size={ 16 } /> }
						onClick={ addPrompt }
					><I18n>New Prompt</I18n></Button>
				</div> : null }
				{ !store.status.loading && hasItems ? <DndContext
					sensors={ sensors }
					modifiers={ [ restrictToVerticalAxis ] }
					onDragEnd={ onDragEnd }
				>
					<SortableContext
						items={ store.items.map( item => item.id ) }
						strategy={ verticalListSortingStrategy }
					>
						<div className="prompt-card-list">
							{ store.items.map( ( item , index ) => {
								/* 通过 createdAt 时间戳判断是否为刚创建的新卡片 */
								const isNew = Date.now() - item.createdAt < 800;
								return <PromptCardEnterWrapper
									key={ item.id }
									isNew={ isNew }
									onDelete={ () => deletePrompt( item.id ) }
								>
									<PromptCard
										item={ item }
										index={ index }
										isNew={ isNew }
									/>
								</PromptCardEnterWrapper>;
							} ) }
						</div>
					</SortableContext>
				</DndContext> : null }
			</section>
		</main>
	</ConfigProvider>;
} );

/* 卡片进入/退出动画包裹器 — 统一管理卡片的进场展开与退场折叠动画 */
const PromptCardEnterWrapper = reaxper( ( props: {
	isNew: boolean;
	children: React.ReactNode;
	onDelete: () => void;
} ) => {
	/* 进入动画：播放一次后标记已进入 */
	const [ hasEntered , setHasEntered ] = useState( false );
	/* 退出动画：删除请求到达后标记退出中，动画完成后真正移除 */
	const [ isExiting , setIsExiting ] = useState( false );
	const shouldEnter = props.isNew && !hasEntered && !isExiting;

	const handleDeleteRequest = () => {
		/* 避免重复触发 */
		if( isExiting ) return;
		setIsExiting( true );
	};

	return <div
		className={ `prompt-card-enter-wrapper ${ shouldEnter ? 'is-entering' : '' } ${ isExiting ? 'is-exiting' : '' }` }
		onAnimationEnd={ ( e: React.AnimationEvent ) => {
			if( e.animationName === 'prompt-card-expand' && shouldEnter ) {
				setHasEntered( true );
			}
			/* 退场动画结束后真正从 store 中移除 */
			if( e.animationName === 'prompt-card-collapse' && isExiting ) {
				props.onDelete();
			}
		} }
	>
		{/* 将删除请求回调与退出状态注入子组件 */}
		{ React.cloneElement( props.children as React.ReactElement<any> , {
			onRequestDelete : handleDeleteRequest,
			isExiting,
		} ) }
	</div>;
} );

const PromptCard = reaxper( ( props: {
	item: PromptView.Item;
	index: number;
	isNew?: boolean;
	onRequestDelete?: () => void;
	isExiting?: boolean;
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
	/* 新卡片气泡弹开动画：初次渲染时播放一次 */
	const [ isPopping , setIsPopping ] = useState( () => props.isNew || false );

	return <article
		ref={ setNodeRef }
		style={ style }
		className={ `prompt-card ${ isDragging ? 'is-dragging' : '' } ${ isPopping ? 'prompt-card--popping' : '' } ${ props.isExiting ? 'prompt-card--exiting' : '' }` }
		onAnimationEnd={ ( e: React.AnimationEvent ) => {
			/* 仅响应气泡弹开动画结束，清理状态避免重复播放 */
			if( e.animationName === 'prompt-card-pop' ) {
				setIsPopping( false );
			}
		} }
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
						onClick={ () => {
							/* 若外层包裹器提供了退场回调，委托其播放动画后再移除 */
							if( props.onRequestDelete ) {
								props.onRequestDelete();
							} else {
								deletePrompt( props.item.id );
							}
						} }
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

import { reaxel_PromptView } from '#PromptView/reaxels/prompt-view';
import {
	I18n ,
	i18n,
} from '#PromptView/reaxels/exports';
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
