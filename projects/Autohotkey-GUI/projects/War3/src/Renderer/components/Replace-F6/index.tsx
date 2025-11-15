export const ReplaceF6 = reaxper( () => {
	
	const movRef = useRef<HTMLVideoElement>( null );
	
	const { toggleReplaceF6 } = reaxel_HotkeyEnhancer();
	
	useEffect( () => {
		const disposer = obsReaction( ( first , disposer ) => {
			crayon.blue( '对GUI_Store.ModalVisible_F6ShowCase的监听:' , reaxel_HotkeyEnhancer.store.ModalVisible_F6ShowCase );
			const { ModalVisible_F6ShowCase } = reaxel_HotkeyEnhancer.store;
			if( ModalVisible_F6ShowCase ) {
				setTimeout( () => {
					movRef.current?.play();
				} , 500 );
			} else {
				if( !movRef.current ) return;
				movRef.current.pause();
				movRef.current.currentTime = 0;
			}
			return disposer;
		} , () => [] );
		return disposer;
	} , [ reaxel_HotkeyEnhancer.store.ModalVisible_F6ShowCase ] );
	
	return <>
		<FunctionSwitcher
			value = { reaxel_HotkeyEnhancer.store.switch_replaceF6 }
			onChange = { toggleReplaceF6 }
		>
			<I18n>Replace F6 quick save with timestamped save</I18n>
			
			<InfoCircleTwoTone
				style = { { marginLeft : '14px' } }
				onClick = { () => {
					reaxel_HotkeyEnhancer.setState( { ModalVisible_F6ShowCase : true } );
				} }
			/>
			<Modal
				className = { less.F6ShowcaseModal }
				open = { reaxel_HotkeyEnhancer.store.ModalVisible_F6ShowCase }
				onCancel = { () => {
					reaxel_HotkeyEnhancer.setState( { ModalVisible_F6ShowCase : false } );
				} }
				footer = { null }
				closable
				width = "auto"
				centered
			>
				<video
					ref = { movRef }
					src = { mov }
					muted
					controls
					loop
					style = { {
						width : '9999vw' ,
						maxWidth : '92vw' ,
						aspectRatio : 16 / 9 ,
					} }
				/>
			</Modal>
		
		</FunctionSwitcher>
		<SpaceF6SaveToSpecial />
	</>;
} );

import { SpaceF6SaveToSpecial } from './Space&F6-Save-To-Special';
import { reaxel_HotkeyEnhancer } from '#renderer/reaxels/hotkey-enhancer';
import { FunctionSwitcher , IconPopoverDesc , HotKey } from '#renderer/pure-components';
import { InfoCircleTwoTone } from '@ant-design/icons';
import { Modal } from 'antd';
import mov from './show case.mov';
import less from './style.module.less';
