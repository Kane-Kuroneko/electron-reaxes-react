const { Item } = Form;

export const App = reaxper( () => {
	const store = reaxel_SettingsView.store.RootMenu;
	const setState = reaxel_SettingsView.setState.RootMenu;
	
	const { getSettings } = reaxel_SettingsView();
	
	const MenuContentComponent = {
		net : RCNetworkPanel ,
		appearance : RCAppearancePanel ,
		mngeai : RCManageAIsPanel ,
		sys : RCSystemPanel ,
		// hk : RCHotkeysPanel,
	}[store.current];
	
	useEffect( () => {
		~async function () {
			const settings = await getSettings();
			reaxel_SettingsView.setState.UIControls.networks( settings?.global_proxy ?? {} );
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
				style={ { userSelect : 'none' } }
				items={ store.menus.map( it => {
					return {
						...it ,
						key : it.value,
					};
				} ) }
				onSelect={ ( { key } ) => {
					setState( { current : key as any } );
				} }
				selectedKeys={ [ store.current ] }
			/>
			<Form
				layout="vertical"
			>
				<MenuContentComponent />
			</Form>
		</div>
		<div>
			<Button
				onClick={ () => {
					IPC.send( 'exit-settings' );
				} }
				danger
				type="primary"
			>Exit Without Sumbit</Button>
			
			<Button
				danger
				type="dashed"
				onClick={ () => {
					IPC.send( 'exit-settings' );
				} }
			>Discard All Changes</Button>
			
			<Button
				type="primary"
				onClick={ () => {
					IPC.send( 'exit-settings' );
				} }
			>Save All   3222</Button>
		</div>
	</div>;
} );

import { RCAppearancePanel } from './components/Appearance';
import { RCManageAIsPanel } from './components/ManageAIs';
import { RCNetworkPanel } from './components/Network';
import { RCSystemPanel } from './components/System';
import {
	Button ,
	Form ,
	Menu ,
} from 'antd';
import { reaxper  } from 'reaxes-react';
import './index.less';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";

import './index.less';
