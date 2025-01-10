export const Layout = reaxper( (props:React.PropsWithChildren) => {
	
	
	return <div className = "war3-ahk-reaxes">
		<SegmentedSwitcher/>
		<I18NDropdown />
		<DarkModeSwitchLottie/>
		<Outlet/>
		<FloatButtons />
		<Footer/>
		<ModalSponsor />
	</div>;
} );

import { Footer } from '#renderer/components/Footer';
import { SegmentedSwitcher } from '#renderer/components/Segmented-Switcher';
import { ModalSponsor } from '#renderer/components/Modal-Sponsor';
import { FloatButtons } from '#renderer/components/Float-Buttons';
import { I18NDropdown } from '#renderer/components/I18N-Dropdown';
import { DarkModeSwitchLottie } from '#renderer/components/Dark-Mode';
import '#renderer/styles/global.module.less';
import '#renderer/styles/index.less';
import { Outlet } from 'react-router-dom';
