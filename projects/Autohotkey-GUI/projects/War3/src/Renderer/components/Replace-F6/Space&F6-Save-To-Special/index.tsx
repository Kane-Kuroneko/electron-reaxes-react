@reaxper
export class SpaceF6SaveToSpecial extends Component {
	constructor( props ) {super( props );}
	
	render() {
		const { GUI_Store , GUI_SetState , GUI_Mutate , toggleEditSpecialSavesListModalVisible } = reaxel_HotkeyEnhancer();
		return <>
			<div
				style={{marginLeft : '63px'}}
			>
				<label>
					<Checkbox
						style={{marginRight : 6}}
						checked = { GUI_Store.switch_SpaceF6SaveToSpecial }
						onChange = { e => GUI_Mutate( s => s.switch_SpaceF6SaveToSpecial = !s.switch_SpaceF6SaveToSpecial ) }
					/>
					<span
						style = { {
							textIndent : '2em' ,
						} }
					>
						<I18n>Space + F6 will be saved as a special name</I18n>
					</span>
				</label>
				
				<Button
					type = "link"
					onClick = { () => {
						toggleEditSpecialSavesListModalVisible();
					} }
				><I18n>Edit</I18n></Button>
				
				<Modal
					title = {i18n('edit special list')}
					open = { GUI_Store.ModalVisible_editSpecialSavesList }
					onCancel = { () => {
						toggleEditSpecialSavesListModalVisible();
					} }
					onOk = { () => {
						toggleEditSpecialSavesListModalVisible();
					} }
					centered
				>
				
				</Modal>
			</div>
		</>;
	}
}

import { reaxel_HotkeyEnhancer } from '#renderer/reaxels/hotkey-enhancer';
import { Switch , Checkbox , Button , Modal } from 'antd';

import { Component } from 'react';
