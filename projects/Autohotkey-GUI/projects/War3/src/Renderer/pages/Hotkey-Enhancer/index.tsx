export const HotkeyEnhancer = reaxper( () => {
	
	const { language } = reaxel_I18n();
	
	return <MainConententAreaContainer>
		<div style={{
			width : {
				'zh-CN' : '500px',
				'en-US' : '600px',
			}[language] || '600px',
			margin : '0 auto',
		}}>
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
		<HotEnhancerTips/>
	</MainConententAreaContainer>;
} );

import { HotEnhancerTips } from '#project/src/Renderer/components/Only-Browser-Shown';
import { reaxel_I18n } from '#reaxels/i18n';
import { MainConententAreaContainer } from '#project/src/Renderer/pure-components/Main-Content-Area-Container';
import { MButtonToAtttack } from '#project/src/Renderer/components/MButton-to-Atttack';
import { ForbidMouseWheels } from '#project/src/Renderer/components/Forbid-MouseWheels';
import { ReplaceF6 } from '#project/src/Renderer/components/Replace-F6';
import { RbuttonDragging } from '#project/src/Renderer/components/Rbutton-Dragging';
import { MainSwitch } from '#project/src/Renderer/components/Main-Switch';
import { AltInventory } from '#project/src/Renderer/pure-components';
import { Divider } from 'antd';
