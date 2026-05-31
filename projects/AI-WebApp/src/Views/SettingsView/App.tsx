export const App = reaxper( () => {
	const store = reaxel_SettingsView.store.RootMenu;
	const setState = reaxel_SettingsView.setState.RootMenu;
	
	const { applySettings , exitSettings , reloadSettings , isDirty } = reaxel_SettingsView();
	
	const MenuContentComponent = {
		general : RCGeneralPanel ,
		net : RCNetworkPanel ,
		mngeai : RCManageAIsPanel ,
	}[store.current];
	
	// 触发响应式依赖收集 - 让按钮状态随 UIControls 变化而更新
	const dirty = isDirty();
	
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
				type="dashed"
				disabled={ !dirty }
				onClick={ async() => {
					await reloadSettings();
				} }
			><I18n>Discard Changes</I18n></Button>
			
			<Button
				danger
				onClick={ () => {
					exitSettings();
				} }
			><I18n>Exit Without Save</I18n></Button>
			
			<Button
				disabled={ !dirty }
				onClick={ async() => {
					const result = await applySettings();
					showApplyResult( result );
				} }
			><I18n>Apply</I18n></Button>
			
			<Button
				type="primary"
				disabled={ !dirty }
				onClick={ async() => {
					const result = await applySettings();
					showApplyResult( result );
					if( result.success ) {
						exitSettings();
					}
				} }
			><I18n>Save & Exit</I18n></Button>
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
					{ result.restartReasons.map( reason => <li key={ reason }>{ reason }</li> ) }
				</ul>
			</div>,
		} );
		return;
	}
	message.success( i18n('Settings applied') );
};

import { RCGeneralPanel } from './components/General';
import { RCManageAIsPanel } from './components/ManageAIs';
import { RCNetworkPanel } from './components/Network';
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
