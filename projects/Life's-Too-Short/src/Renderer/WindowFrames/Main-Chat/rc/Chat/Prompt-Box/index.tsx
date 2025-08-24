const { TextArea } = Input;

export const PromptBox = reaxper( (props:PromptBoxProps) => {
	
	const {
		store ,
		setState ,
		mutate,
	} = useReaxable( {
		editing : false ,
		editingContent : '你是一个专业母猪助产士,需要帮助母猪顺利生产并进行产后护理',
		enabled : true ,
	} );
	
	const textareaRef = useRef<TextAreaRef>(null);
	
	useEffect( () => {
		if(store.editing && textareaRef.current?.resizableTextArea.textArea.tagName === 'TEXTAREA'){
			textareaRef.current.focus();
		}
		console.log(textareaRef.current);
	} , [ store.editing ] );
	
	return <div
		className={ less.promptBox }
	>
		{ store.editing ?
			<TextArea
				ref={ textareaRef }
				className="prompt-editing-textarea"
				onChange={ ( e ) => setState( { editingContent : e.target.value } ) }
				value={ store.editingContent }
				disabled={ !store.enabled }
			/> :
			<div
				className={ classnames( "prompt-show-box" , !store.enabled && 'disabled' ) }
				onDoubleClick={ () => {
					if( !store.enabled ) return;
					setState( { editing : true } );
				} }
			>
				{ props.content || store.editingContent }
			</div>
			
		}
		<div className="tool-area">
			<Switch
				value={ store.enabled }
				onChange={ ( status ) => {
					setState( {
						enabled : status ,
						editing : store.editing && false,
					} );
				} }
			/>
			
			<span style={ {} }>
				{ !store.editing && <EditPromptBtn>复制</EditPromptBtn> }
				{ !store.editing && <EditPromptBtn onClick={ () => setState( { editing : true } ) }>编辑</EditPromptBtn> }
				{ store.editing && <EditPromptBtn>保存</EditPromptBtn> }
				{ store.editing && <EditPromptBtn onClick={ () => setState( { editing : false } ) }>取消</EditPromptBtn> }
			</span>
		</div>
	</div>;
} );

const EditPromptBtn = reaxper((props:React.PropsWithChildren<{
	onClick?(e:React.MouseEvent<HTMLSpanElement,MouseEvent>):void;
	
}>) => {
	return <Tag
		onClick={(e) => {
			props.onClick?.(e);
		}}
		style={{
			userSelect : 'none',
			cursor : 'pointer'
		}}
	>
		{props.children}
	</Tag>
})

export type PromptBoxProps = {
	content? : string;
	
}


import {
	Button ,
	Input,
	Tag,
	Switch,
} from 'antd';
import type {TextAreaRef} from 'antd/lib/input/TextArea';
import less from './index.module.less';
import type {} from '#src/types/Chat';
import { useReaxable } from 'reaxes-react/hooks';
import classnames from 'classnames';
