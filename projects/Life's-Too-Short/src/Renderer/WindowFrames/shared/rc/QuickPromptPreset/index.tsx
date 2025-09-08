export const QuickPromptPreset = reaxper( ( props: QuickPromptPresetProps ) => {
	
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
					zoom : 0.65 ,
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
	
	useCtrlEnter( ( activeElement ) => {
		if( !store.editing ) return;
		// 判断是否聚焦在 input 或 textarea
		const isInput = inputRef.current?.input === activeElement;
		const isTextArea = textAreaRef.current?.resizableTextArea.textArea === activeElement;
		if( isInput || isTextArea ) {
			handleEdit();
		}
	} );
	
	// 1. Focus textarea on entering edit mode
	useEffect( () => {
		if( store.editing && textAreaRef.current?.resizableTextArea ) {
			// Focus textarea if available, else input
			setTimeout( () => {
				textAreaRef.current.resizableTextArea.textArea.focus();
			} );
		}
	} , [ store.editing ] );
	
	// 2. Alt+Up/Down to switch focus between input and textarea
	useAltArrowFocus( {
		getElements() {
			return [
				inputRef.current?.input! ,
				textAreaRef.current?.resizableTextArea?.textArea ,
			] as Element[];
		} ,
		getTriggerCondition() {
			return store.editing;
		} ,
		cycle : true ,
	} );
	
	return <div
		onContextMenu={ ( event ) => {
			if( store.editing ) {
				return;
			}
			return handleContextMenu( ( e ) => {} )( event );
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

export type QuickPromptPresetProps = {
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

import {
	ItemType ,
	useContextMenu ,
} from "#Main-Chat/rc/LeftAside/Channels/useContextMenu";
import {
	Input ,
	type InputRef ,
	Popover ,
	Space ,
	Switch ,
} from 'antd';
import {
	CheckCircleTwoTone ,
	CloseCircleTwoTone ,
} from '@ant-design/icons';
import less from './style.module.less';
import classnames from 'classnames';
import { type TextAreaRef } from 'antd/lib/input/TextArea';
import { useEffect } from "react";
import { useCtrlEnter } from "#renderer/WindowFrames/shared/hooks/useCtrlEnter";
import { useAltArrowFocus } from "#renderer/WindowFrames/shared/hooks/useAltArrowFocus";
