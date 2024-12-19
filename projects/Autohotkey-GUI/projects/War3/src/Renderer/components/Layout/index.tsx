export const Layout = reaxper( (props:React.PropsWithChildren) => {
	
	
	return <div className = "war3-ahk-reaxes">
		<SegmentedSwitcher/>
		<I18NDropdown />
		<Outlet/>
		<FloatButtons />
		<Footer/>
		<ModalSponsor />
	</div>;
} );

import { Footer } from '#project/src/Renderer/components/Footer';
import { SegmentedSwitcher } from '#project/src/Renderer/components/Segmented-Switcher';
import { ModalSponsor } from '#project/src/Renderer/components/Modal-Sponsor';
import { FloatButtons } from '#project/src/Renderer/components/Float-Buttons';
import { I18NDropdown } from '#project/src/Renderer/components/I18N-Dropdown';
import '#project/src/Renderer/styles/global.module.less';
import '#project/src/Renderer/styles/index.less';
import { Outlet } from 'react-router-dom';
