export const App = reaxper( () => {
	const store = reaxel_SettingsView.store.RootMenu;
	const setState = reaxel_SettingsView.setState.RootMenu;
	
	const { applySettings , exitSettings , reloadSettings } = reaxel_SettingsView();
	
	const MenuContentComponent = {
		net : RCNetworkPanel ,
		appearance : RCAppearancePanel ,
		mngeai : RCManageAIsPanel ,
		sys : RCSystemPanel ,
		// hk : RCHotkeysPanel,
	}[store.current];
	
	
	return <div className="settings-root">
		<div className="settings-body">
			<div className="settings-sider">
				<Menu
					items={ store.menus.map( it => {
						return {
							...it ,
							key : it.value,
							label: <I18n>{it.label}</I18n>,
						};
					} ) }
					onSelect={ ( { key } ) => {
						setState( { current : key as any } );
					} }
					selectedKeys={ [ store.current ] }
				/>
			</div>
			<div className="settings-content">
				<div className="settings-panel">
					<MenuContentComponent />
				</div>
			</div>
		</div>
		<div className="settings-footer">
			<Button
				onClick={ () => {
					exitSettings();
				} }
				danger
				type="primary"
			><I18n>Exit Without Sumbit</I18n></Button>
						
			<Button
				danger
				type="dashed"
				onClick={ async() => {
					await reloadSettings();
					exitSettings();
				} }
			><I18n>Discard All Changes</I18n></Button>
						
			<Button
				onClick={ async() => {
					const result = await applySettings();
					showApplyResult( result );
				} }
			><I18n>Apply</I18n></Button>
						
			<Button
				type="primary"
				onClick={ async() => {
					const result = await applySettings();
					showApplyResult( result );
					if( result.success ) {
						exitSettings();
					}
				} }
			><I18n>Save All</I18n></Button>
		</div>
	</div>;
} );

const showApplyResult = (result:SettingsApplyResult) => {
	if( !result.success ) {
		message.error( result.error || 'Failed to apply settings' );
		return;
	}
	if( result.restartRequired ) {
		Modal.warning( {
			title : <I18n>Restart required</I18n> ,
			content : <div>
				<div><I18n>Settings were saved. These changes require restarting the app:</I18n></div>
				<ul>
					{ result.restartReasons.map( reason => <li key={ reason }><I18n>{ reason }</I18n></li> ) }
				</ul>
			</div>,
		} );
		return;
	}
	message.success( 'Settings applied' );
};

import { RCAppearancePanel } from './components/Appearance';
import { RCManageAIsPanel } from './components/ManageAIs';
import { RCNetworkPanel } from './components/Network';
import { RCSystemPanel } from './components/System';
import {
	Button ,
	Menu ,
	message ,
	Modal,
} from 'antd';
import { reaxper  } from 'reaxes-react';
import './index.less';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import type { SettingsApplyResult } from "#src/Types/SettingsTypes";
