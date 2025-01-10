export const ReplaceF6 = reaxper( () => {
	
	const movRef = useRef<HTMLVideoElement>( null );
	
	const { GUI_Store , toggleReplaceF6 , GUI_Mutate , GUI_SetState } = reaxel_GUI();
	
	useEffect( () => {
		const disposer = obsReaction( ( first , disposer ) => {
			crayon.blue( '对GUI_Store.ModalVisible_F6ShowCase的监听:' , GUI_Store.ModalVisible_F6ShowCase );
			const { ModalVisible_F6ShowCase } = GUI_Store;
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
	} , [ GUI_Store.ModalVisible_F6ShowCase ] );
	
	return <>
		<FunctionSwitcher
			value = { GUI_Store.switch_replaceF6 }
			onChange = { toggleReplaceF6 }
		>
			<I18n>Replace F6 quick save with timestamped save</I18n>
			
			<InfoCircleTwoTone
				style = { { marginLeft : '14px' } }
				onClick = { () => {
					GUI_SetState( { ModalVisible_F6ShowCase : true } );
				} }
			/>
			<Modal
				className = { less.F6ShowcaseModal }
				open = { GUI_Store.ModalVisible_F6ShowCase }
				onCancel = { () => {
					GUI_SetState( { ModalVisible_F6ShowCase : false } );
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
import { reaxel_GUI } from '#renderer/reaxels/hotkey-enhancer';
import { FunctionSwitcher , IconPopoverDesc , HotKey } from '#renderer/pure-components';
import { InfoCircleTwoTone } from '@ant-design/icons';
import { Modal } from 'antd';
import mov from './show case.mov';
import * as less from './style.module.less';
