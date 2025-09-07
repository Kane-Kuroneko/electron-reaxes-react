import {
	useContextMenu ,
	ItemType ,
} from "#Main-Chat/rc/LeftAside/Channels/useContextMenu";

export const QuickPromptPreset = reaxper( ( props: QuickPromptPreset ) => {
	
	const {
		store ,
		setState ,
	} = useReaxable( {
		enabled : true ,
		
		editing : false ,
		editingTitle : props.preset.title ,
		editingText : props.preset.content ,
	} );
	
	const menuItems: ItemType[] = useRef( [
		{
			key : 'edit' ,
			title : '编辑' ,
			label : '编辑' ,
			onClick( menuInfo ) {
				setState( { editing : true } );
			} ,
		} ,
		{
			key : 'delete' ,
			title : '删除' ,
			label : '删除' ,
			onClick( menuInfo ) {
				props.onDelete?.( props.preset.preset_prompt_id );
			} ,
		} ,
	] ).current;
	
	const inputRef = useRef<InputRef>( null ) ;
	const textAreaRef = useRef<TextAreaRef>( null );
	
	const {
		handleContextMenu ,
		ContextMenu ,
	} = useContextMenu( { menuItems } );
	
	useCtrlEnter( ( activeElement ) => {
		if( !store.editing ) return;
		// 判断是否聚焦在 input 或 textarea
		const isInput = inputRef.current?.input === activeElement;
		const isTextArea = textAreaRef.current?.resizableTextArea.textArea === activeElement;
		if( isInput || isTextArea ) {
			handleEdit();
		}
	} );
	
	const editing = {
		get title (){
			return <Input
				ref={ inputRef }
				value={ store.editingTitle }
				onChange={ ( e ) => {
					setState( { editingTitle : e.target.value } );
				} }
				suffix={ <Space.Compact size="small">
					<CheckCircleTwoTone
						style={ {
							fontSize : '20px' ,
							cursor : 'pointer' ,
						} }
						twoToneColor="#52c41a"
						onClick={ () => {
							handleEdit();
						} }
					/>
					<CloseCircleTwoTone
						twoToneColor="#eb2f96"
						style={ {
							fontSize : '20px' ,
							marginLeft : '6px' ,
							cursor : 'pointer' ,
						} }
						onClick={ () => {
							setState( {
								editing : false ,
								editingText : props.preset.content ,
								editingTitle : props.preset.title ,
							} );
						} }
					/>
				</Space.Compact> }
				variant="borderless"
			/>;
		},
		get content (){
			return <Input.TextArea
				ref={ textAreaRef }
				value={ store.editingText }
				onChange={ ( e ) => {
					setState( { editingText : e.target.value } );
				} }
				rows={ 6 }
				autoFocus
				variant="borderless"
			/>;
		} 
	};
	
	const ordinary = {
		get title (){
			return <span
				className="ordinary-title"
				onDoubleClick={ ( e ) => {
					if( !store.enabled ) {
						return;
					}
					setState( { editing : true } );
				} }
			>
				{ props.preset.title }
			</span>
		} ,
		get enabledSwitch(){
			return <Switch
				style={ {
					zoom : 0.62 ,
					marginLeft : 8 ,
				} }
				value={ store.enabled }
				onChange={ ( e ) => {
					setState( { enabled : e } );
				} }
			/>;
		} ,
	};
	
	const handleEdit = () => {
		props.onEdit?.( {
			content : store.editingText ,
			title : store.editingTitle ,
			preset_prompt_id : props.preset.preset_prompt_id ,
		} );
		
		setState( {
			editing : false ,
			editingText : props.preset.content ,
			editingTitle : props.preset.title ,
		} );
	};
	
	// 1. Focus textarea on entering edit mode
	useEffect( () => {
		if( store.editing && textAreaRef.current?.resizableTextArea ) {
			// Focus textarea if available, else input
			setTimeout( () => {
				textAreaRef.current.resizableTextArea.textArea.focus();
			} );
		}
		
	} , [ store.editing ] );
	
	useEffect( () => {
		window.getElements = () => [
			inputRef.current ,
			textAreaRef.current?.resizableTextArea?.textArea ,]
	} , [inputRef.current,textAreaRef.current] );
	
	// 2. Alt+Up/Down to switch focus between input and textarea
	useAltArrowFocus( {
		getElements() {
			return [
				inputRef.current?.input! ,
				textAreaRef.current?.resizableTextArea?.textArea ,
			] as Element[];
		} ,
		get triggerCondition() {
			return store.editing;
		} ,
		getDefaultFocusEl : () => document.activeElement ,
		cycle : true ,
	} );
	
	return <div
		onContextMenu={ ( event ) => {
			if( store.editing ) {
				return;
			}
			return handleContextMenu( ( e ) => {
				
			} )( event );
			
		} }
		className={ classnames( less.quickPromptPreset , !store.enabled && 'disabled' ) }
	>
		<Popover
			open={ store.editing }
			content={ editing.content }
		>
			<>
				{ store.editing ?
					
					editing.title :
					
					<div
						style={ {
							margin : '7px 11px' ,
							display : 'flex' ,
							alignItems : 'center',
						} }
					>
						{ ordinary.title }
						{ ordinary.enabledSwitch }
					</div> }
			</>
		</Popover>
		<ContextMenu />
	</div>;
} );

export type QuickPromptPreset = {
	preset: {
		title: string;
		content: string;
		preset_prompt_id: string;
	};
	onEdit?: ( preset: {
		content: string;
		title: string;
		preset_prompt_id: string;
	} ) => void;
	onDelete?: ( preset_prompt_id: string ) => void;
}

const useCtrlEnter = ( fn: ( activeElement: Element | null , e: KeyboardEvent ) => void ) => {
	useEffect( () => {
		const handler = ( e: KeyboardEvent ) => {
			if( e.key === 'Enter' && e.ctrlKey ) {
				fn( document.activeElement , e );
			}
		};
		window.addEventListener( 'keydown' , handler );
		return () => {
			window.removeEventListener( 'keydown' , handler );
		};
	} , [ fn ] );
};


/**
 * @desc
 * [Alt] + ⬆️/⬇️ 键切换焦点
 * @description
 * `getElements`和`getDefaultFocusEl`需要动态返回,因为如果是静态传入,在useEffect()运行时传入的element还未commit到dom中,element必须在useEffect执行回调时才能拿到挂载好的elements
 * @param getElements 可foucs的元素合集,按照上下顺序排列,这个顺序决定了按上下键时的切换顺序
 * @param getDefaultFocusEl 默认聚焦的元素
 * @param cycle 是否循环切换,默认true
 * @param triggerCondition 只有为true时才会触发hooks内的逻辑
 */
const useAltArrowFocus = ( {
	getElements ,
	getDefaultFocusEl ,
	cycle = true ,
	triggerCondition ,
}: {
	getElements: () => Element[];
	cycle?: boolean;
	getDefaultFocusEl: () => Element;
	triggerCondition?: boolean;
} ) => {
	const {
		store ,
		setState,
	} = useReaxable( {
		currentIndex : 0 ,
	} );
	useEffect( () => {
		if( !triggerCondition ) {
			return;
		}
		const handler = ( e: KeyboardEvent ) => {
			if( !e.altKey || (
				e.key !== 'ArrowUp' && e.key !== 'ArrowDown'
			) ) return;
			if( e.key === 'ArrowDown' ) {
				var offset = 1;
			} else if( e.key === 'ArrowUp' ) {
				var offset = -1;
			}
			
			const elements = getElements();
			const nextElementIndex = cycle === false ? 
				
				store.currentIndex + offset :
				
				(store.currentIndex + offset + elements.length) % elements.length;
			
			if( nextElementIndex < 0 || nextElementIndex >= elements.length ) return;
			
			const nextElement = elements[nextElementIndex] as HTMLElement;
			if( nextElement ) {
				e.preventDefault();
				nextElement.focus();
				setState( { currentIndex : nextElementIndex } );
			}
		};
		window.addEventListener( 'keydown' , handler );
		return () => window.removeEventListener( 'keydown' , handler );
	} , [ triggerCondition , getElements() ] );
	
	useEffect( () => {
		if( !triggerCondition ) {
			return;
		}
		const elements = getElements();
		setState( {
			currentIndex : elements.indexOf( getDefaultFocusEl() ) ,
		} );
	} , [ triggerCondition ] );
	
};

const presets = [
	{
		"title" : "简洁模式" ,
		"content" : "只返回核心答案，不做解释，不提供额外背景信息。" ,
	} ,
	{
		"title" : "详细模式" ,
		"content" : "在回答时提供完整推理过程、背景知识和相关案例。" ,
	} ,
	{
		"title" : "批判模式" ,
		"content" : "对问题或观点进行多角度分析，强调缺陷、限制和潜在反例。" ,
	} ,
	{
		"title" : "创意模式" ,
		"content" : "给出新颖、不拘泥于常规的答案，可以包含假设性和探索性内容。" ,
	} ,
	{
		"title" : "教学模式" ,
		"content" : "以循序渐进的方式解释问题，面向学习者，避免过度省略。" ,
	} ,
];


import {
	Input ,
	Button ,
	Space ,
	Popover ,
	Checkbox ,
	Switch ,
} from 'antd';
import {
	CheckCircleTwoTone ,
	CloseCircleTwoTone ,
} from '@ant-design/icons';
import less from './style.module.less';
import classnames from 'classnames';
import { type InputRef } from 'antd';
import { type TextAreaRef } from 'antd/lib/input/TextArea';
import { useEffect } from "react";
import { shallowEqual } from "reaxes-utils";
