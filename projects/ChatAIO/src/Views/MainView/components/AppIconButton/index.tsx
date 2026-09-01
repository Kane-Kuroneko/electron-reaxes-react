/**
 * Menubar App Icon（纯展示，无点击）。
 * 图标由 webpack 打包 `statics/icons/app-icon[-dev].png`；Win 在栏最左，macOS 在红绿灯右侧。
 * 见 docs/architecture/app-icons.md
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


import appIconProd from '../../../../../statics/icons/app-icon.png';
import appIconDev from '../../../../../statics/icons/app-icon-dev.png';
import { reaxper } from 'reaxes-react';

const appIconUrl = __DEV__ ? appIconDev : appIconProd;
