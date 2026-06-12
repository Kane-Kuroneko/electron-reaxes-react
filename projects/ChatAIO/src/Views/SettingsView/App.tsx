export const App = reaxper( () => {
	const store = reaxel_SettingsView.store.RootMenu;
	const setState = reaxel_SettingsView.setState.RootMenu;
	const resolvedTheme = resolveThemePreference(
		reaxel_SettingsView.store.UIControls.appearance.theme ,
		reaxel_SettingsView.store.Environment.systemTheme,
	);
	
	const { applySettings , exitSettings , exitWithoutSave , reloadSettings , isDirty } = reaxel_SettingsView();
	
	const MenuContentComponent = {
		general : RCGeneralPanel ,
		net : RCNetworkPanel ,
		mngeai : RCManageAIsPanel ,
		about : RCAboutPanel ,
	}[store.current];
	
	// 触发响应式依赖收集 - 让按钮状态随 UIControls 变化而更新
	const dirty = isDirty();
	
	return <ConfigProvider
		theme={ {
			algorithm : resolvedTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
		} }
	>
		<div className="settings-root">
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
				{ __DEV__ && <LongPressButton
					danger
					onConfirm={ async() => {
						const result = await devCleanStart();
						if( !result.success ) {
							message.error( result.error || 'Clean start failed' );
						}
					} }
				><I18n>Clean Start</I18n></LongPressButton> }
				<Button
					type="dashed"
					disabled={ !dirty }
					onClick={ async() => {
						await reloadSettings();
					} }
				><I18n>Discard Changes</I18n></Button>

				<Button
					danger
					onClick={ async() => {
						await exitWithoutSave();
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
		</div>
	</ConfigProvider>;
} );

const LongPressButton = (props:any) => {
	const {
		onConfirm ,
		...buttonProps
	} = props;
	const [ holding , setHolding ] = useState( false );
	const [ progress , setProgress ] = useState( 0 );
	const timerRef = useRef<ReturnType<typeof setInterval>>( null );
	const startedAt = useRef( 0 );
	const holdMs = 900;

	const stop = () => {
		if( timerRef.current ) {
			clearInterval( timerRef.current );
			timerRef.current = null;
		}
		setHolding( false );
		setProgress( 0 );
	};

	const start = () => {
		if( buttonProps.loading || timerRef.current ) return;
		startedAt.current = Date.now();
		setHolding( true );
		timerRef.current = setInterval( () => {
			const nextProgress = Math.min( 1 , ( Date.now() - startedAt.current ) / holdMs );
			setProgress( nextProgress );
			if( nextProgress >= 1 ) {
				stop();
				onConfirm?.();
			}
		} , 16 );
	};

	return <Button
		{ ...buttonProps }
		onMouseDown={ start }
		onMouseUp={ stop }
		onMouseLeave={ stop }
		onTouchStart={ start }
		onTouchEnd={ stop }
		className={ `${ buttonProps.className || '' } long-press-button ${ holding ? 'is-holding' : '' }` }
		style={ {
			...buttonProps.style ,
			'--hold-progress' : progress,
		} as any }
	/>;
};

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
import { RCAboutPanel } from './components/About';
import { RCManageAIsPanel } from './components/ManageAIs';
import { RCNetworkPanel } from './components/Network';
import { devCleanStart } from './services/Settings';
import { resolveThemePreference } from '#src/shared/appearance';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import type { SettingsApplyResult } from "#src/Types/SettingsTypes";
import {
	Button ,
	ConfigProvider ,
	Menu ,
	message ,
	Modal,
	theme as antdTheme,
} from 'antd';
import { reaxper  } from 'reaxes-react';
import './index.less';
