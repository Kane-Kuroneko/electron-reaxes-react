/**
 * Menubar App Icon（纯展示，无点击）。
 * 图标由 webpack asset/resource 打包；Win 在栏最左，macOS 在红绿灯右侧。
 */
export const AppIconButton = reaxper( () => {
	return (
		<div
			className="main-view-app-icon"
			aria-hidden="true"
		>
			<img
				className="main-view-app-icon__img"
				src={ appIconUrl }
				alt=""
				draggable={ false }
			/>
		</div>
	);
} );


import appIconProd from '../../../../../statics/gpt.png';
import appIconDev from '../../../../../statics/gpt-dev.png';
import { reaxper } from 'reaxes-react';

const appIconUrl = __DEV__ ? appIconDev : appIconProd;
