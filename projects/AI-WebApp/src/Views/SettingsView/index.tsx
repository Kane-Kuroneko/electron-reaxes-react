const root = createRoot( document.getElementById( "react-app-root" ) );

const { Item } = Form;

@reaxper
class App extends Reaxlass {
	
	menu: ItemType[] = [
		{
			label : 'Network' ,
			key : 'net' ,
		} ,
		{
			label : 'Apperence' ,
			key : 'appe' ,
		} ,
		{
			label : 'Manage AIs' ,
			key : 'manage' ,
		} ,
	];
	
	render() {
		const { getSettings } = reaxel_SettingsView();
		
		const {
			store ,
			setState,
		} = reaxel_SettingsView;
		
		useEffect( () => {
			~async function(){
				const settings = await getSettings();
				setState.UIControls.global_proxy( settings?.global_proxy ?? {} );
			}();
		} , [] );
		
		
		return <div>
			<div
				style={ {
					display : 'flex' ,
					flexFlow : 'row nowrap' ,
				} }
			>
				<Menu
					items={ this.menu }
					onChange={
						( key ) => {
							console.log( key );
						}
					}
					defaultSelectedKeys={ [ "net" ] }
				/>
				<Form
					layout="vertical"
				>
					<div>
						
					</div>
				</Form>
			</div>
			<div>
				<Button
					type="dashed"
					onClick={ () => {
						IPC.send( 'exit-settings' );
					} }
				>Exit Settings</Button>
				
				<Button
					type="primary"
					danger
					onClick={ () => {
						IPC.send( 'exit-settings' );
					} }
				>Discard All Changes</Button>
			</div>
		</div>;
	}
}


root.render( <App /> );



import { type ItemType } from 'antd/lib/menu/interface';
import {
	Menu ,
	Form ,
	Input ,
	Button ,
	Switch ,
	Radio ,
	Select ,
	Space ,
	Segmented ,
	Checkbox ,
} from 'antd';
import {
	createReaxable ,
	obsReaction ,
} from 'reaxes';
import {
	reaxper ,
	Reaxlass ,
} from 'reaxes-react';
import { createRoot } from "react-dom/client";
import './index.less';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels";
