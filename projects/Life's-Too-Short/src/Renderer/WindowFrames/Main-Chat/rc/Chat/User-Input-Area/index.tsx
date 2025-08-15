const { TextArea } = Input;
export const UserInputArea = reaxper( () => {
	
	const { talkToLLM } = reaxel_UserChatInput();
	
	return <div className = { less.userInputArea }>
		<TextArea
			className = "input-box"
			value = { reaxel_UserChatInput.store.textArea_UserInputChatText }
			onChange = { ( e ) => {
				reaxel_UserChatInput.mutate( s => s.textArea_UserInputChatText = e.target.value );
			} }
		/>
		<div className = "operation-container">
			<div className = "options">
				<WheeledSelect />
			</div>
			<Button
				type = "primary"
				onClick={() => talkToLLM()}
			>Send</Button>
		</div>
	</div>;
} );

const WheeledSelect = reaxper( ( props ) => {
	
	const {
		store ,
		setState ,
		mutate ,
	} = useReaxable( {
		open : false ,
		options : [
			{
				value : 'gpt-4o' ,
				text : 'GPT-4o' ,
			} ,
			{
				value : 'gpt-5' ,
				text : 'GPT-5' ,
			} ,
			{
				value : 'gpt-4.1mini' ,
				text : 'GPT-4.1-mini' ,
			} ,
		] ,
		selected : 'gpt-4o' ,
	} );
	
	return <div
		onWheel = { ( e ) => {
			setTimeout(() => {
				console.log(`当前选中的是${store.options.find(s => s.value === store.selected).text}`);
			},200)
			console.log( '滚动方向：' , e.deltaY > 0 ? '向下' : '向上' );
			// setState( {
			// 	open : true ,
			// } );
			switch( true ) {
				//向下滚动,但已选中的就是最后一项
				case e.deltaY > 0 && store.options.findIndex(it => it.value === store.selected) === store.options.length - 1:
				//向上滚动,但已选中的就是第一项
				case e.deltaY < 0 && store.options.findIndex(it => it.value === store.selected) === 0 : {
					//这两种情况都直接return
					return;
				}
			}
			//否则触发滚动选择
			setState( {
				selected : store.options[store.options.findIndex( ( it ) => it.value === store.selected ) + (
					e.deltaY > 0 ? 1 : -1
				)].value ,
			} );
		} }
	
	><Select
		onClick = { ( event ) => {
			setState( { open : !store.open } );
		} }
		onSelect={(value, option) => {
			setState( { selected : value } );
		}}
		value = { store.selected }
		open = { store.open }
		onBlur = { () => setState( { open : false } ) }
		style={{width:'120px'}}
		suffixIcon={null}
	>
		{ store.options.map( ( {
			value ,
			text ,
		} ) => {
			return <Select.Option
				value = {value}
				key = { value }
			>{ text }</Select.Option>;
		} ) }
	</Select></div>;
} );

import { reaxel_UserChatInput } from '#Main-Chat/reaxels/user-chat-input';
import {
	Input ,
	Button ,
	Select ,
} from 'antd';

import less from './index.module.less';
