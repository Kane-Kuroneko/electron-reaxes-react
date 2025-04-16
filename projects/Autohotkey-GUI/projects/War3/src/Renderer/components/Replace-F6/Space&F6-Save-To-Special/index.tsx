@reaxper
export class SpaceF6SaveToSpecial extends Component {
	constructor( props ) {super( props );}
	
	render() {
		const { toggleEditSpecialSavesListModalVisible } = reaxel_HotkeyEnhancer();
		return <>
			<div
				style={{marginLeft : '63px'}}
			>
				<label>
					<Checkbox
						style={{marginRight : 6}}
						checked = { reaxel_HotkeyEnhancer.store.switch_SpaceF6SaveToSpecial }
						onChange = { e => reaxel_HotkeyEnhancer.mutate( s => s.switch_SpaceF6SaveToSpecial = !s.switch_SpaceF6SaveToSpecial ) }
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
					open = { reaxel_HotkeyEnhancer.store.ModalVisible_editSpecialSavesList }
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
