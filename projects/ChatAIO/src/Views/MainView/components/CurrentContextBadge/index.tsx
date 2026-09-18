/**
 * 中区当前 AI / Settings 品牌块。
 * AI 页：左键打开精简 Switch AI 下拉；右键一律吞掉。
 * Settings 打开时：无点击 / hover / 拖窗，右键仍吞掉以免原生窗口菜单。
 * 设计：docs/features/menubar-current-ai-dropdown.md
 */
export const CurrentContextBadge = reaxper( ( {
	label ,
	vendor ,
	isOpen ,
	interactive ,
	onPress ,
} : {
	label : string;
	/** 供应商 logo；Settings 态为 null 只显示文字。见 ai-vendor-logo-identity.md */
	vendor? : AI.VendorRef | null;
	isOpen : boolean;
	interactive : boolean;
	onPress : () => void;
} ) => {
	const staticClassName = interactive ? '' : ' main-view-context-badge--static';
	const openClassName = interactive && isOpen ? ' main-view-context-badge--open' : '';

	return (
		<button
			type="button"
			className={ `main-view-context-badge${ staticClassName }${ openClassName }` }
			data-testid="current-ai-badge"
			title={ label }
			aria-haspopup={ interactive ? 'menu' : undefined }
			aria-expanded={ interactive ? isOpen : undefined }
			aria-disabled={ interactive ? undefined : true }
			aria-label={ label }
			tabIndex={ -1 }
			data-menu-id={ interactive ? CURRENT_AI_MENU_ID : undefined }
			onContextMenu={ ( e ) => {
				e.preventDefault();
				e.stopPropagation();
			} }
			onMouseDown={ ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				if( e.button !== 0 || !interactive ) {
					return;
				}
				onPress();
			} }
			onClick={ ( e ) => {
				e.preventDefault();
				e.stopPropagation();
			} }
		>
			{ vendor ? (
				<span className="main-view-context-badge__vendor" data-vendor={ vendor.family } aria-hidden="true">
					<AIVendorLogo
						family={ vendor.family }
						size={ 14 }
						faviconUrl={ vendor.faviconUrl }
						fallbackText={ vendorFallbackText( vendor , label ) }
					/>
				</span>
			) : null }
			<span className="main-view-context-badge__label">{ label }</span>
		</button>
	);
} );


import { CURRENT_AI_MENU_ID } from '#MainView/reaxels/main-view/current-ai-menu.utility';
import { AIVendorLogo } from '#shared/ai-vendor-logo';
import { vendorFallbackText } from '#shared/ai-vendor-logo/vendor-logo.utility';
import type { AI } from '#src/Types/SettingsTypes/AI';
import { reaxper } from 'reaxes-react';
