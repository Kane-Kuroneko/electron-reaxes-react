export const HotkeyEnhancer = reaxper( () => {
	
	const { language } = reaxel_I18n();
	const [ $screen , $setScreen ] = useState( {
		width : screen.width,
		height : screen.height,
		dpr : window.devicePixelRatio,
	} );
	useEffect( () => {
		
		const id = setInterval( () => {
			$setScreen( {
				width : screen.width ,
				height : screen.height ,
				dpr : window.devicePixelRatio ,
			} );
		} , 1000 );
		return () => clearInterval( id ); 
	} , [] );
	
	return <MainConententAreaContainer>
		<div
			style = { {
				width : {
					'zh-CN' : '500px' ,
					'en-US' : '600px' ,
				}[language] || '600px' ,
				margin : '0 auto' ,
			} }
		>
			<AltInventory />
			<Divider style = { { borderColor : '#dcdcdc' } } />
			<ForbidMouseWheels />
			<Divider style = { { borderColor : '#dcdcdc' } } />
			<ReplaceF6 />
			<Divider />
			<RbuttonDragging />
			<Divider style = { { borderColor : '#dcdcdc' } } />
			<MButtonToAtttack />
			<Divider style = { { borderColor : '#dcdcdc' } } />
			<MainSwitch />
		</div>
		<HotEnhancerTips />
	</MainConententAreaContainer>;
} );


import { HotEnhancerTips } from '#renderer/components/Only-Browser-Shown';
import { reaxel_I18n } from '#renderer/reaxels/i18n';
import { MainConententAreaContainer } from '#renderer/pure-components/Main-Content-Area-Container';
import { MButtonToAtttack } from '#renderer/components/MButton-to-Atttack';
import { ForbidMouseWheels } from '#renderer/components/Forbid-MouseWheels';
import { ReplaceF6 } from '#renderer/components/Replace-F6';
import { RbuttonDragging } from '#renderer/components/Rbutton-Dragging';
import { MainSwitch } from '#renderer/components/Main-Switch';
import { AltInventory } from '#renderer/pure-components';
import { Divider } from 'antd';
