@reaxper
export class SpaceF6SaveToSpecial extends Component {
	constructor( props ) {super( props );}
	
	render() {
		const { GUI_Store , GUI_SetState , GUI_Mutate , toggleEditSpecialSavesListModalVisible } = reaxel_GUI();
		return <>
			<div
			>
				<label>
					<Checkbox
						
						checked = { GUI_Store.switch_SpaceF6SaveToSpecial }
						onChange = { e => GUI_Mutate( s => s.switch_SpaceF6SaveToSpecial = !s.switch_SpaceF6SaveToSpecial ) }
					/>
					<span
						style = { {
							textIndent : '2em' ,
						} }
					>
						Space + F6 will be saved as a special name
					</span>
				</label>
				
				<Button
					type = "link"
					onClick = { () => {
						toggleEditSpecialSavesListModalVisible();
					} }
				>Edit</Button>
				<Modal
					title = "编辑特殊存档列表"
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

import { reaxel_GUI } from '#reaxels/GUI';
import { Switch , Checkbox , Button , Modal } from 'antd';

import { Component } from 'react';
