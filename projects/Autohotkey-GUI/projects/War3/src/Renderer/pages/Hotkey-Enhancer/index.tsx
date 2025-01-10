export const HotkeyEnhancer = reaxper( () => {
	
	const { language } = reaxel_I18n();
	const [ dpr , setDpr ] = useState( null );
	useEffect( () => {
		const getSystemZoom = () => {
			// 获取屏幕的物理像素宽度
			const screenPhysicalWidth = screen.width * window.devicePixelRatio;
			// 屏幕的逻辑宽度（假设系统缩放为 100% 时等于逻辑像素）
			const screenLogicalWidth = screen.width;
			console.log(screenPhysicalWidth);
			return screenPhysicalWidth / screenLogicalWidth;
		};
		setInterval( () => {
			
			setDpr( getSystemZoom() );
		} , 2000 );
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
			<h2>current DPR : { dpr }</h2>
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
