export const Footer = reaxper( () => {
	const { language } = reaxel_I18n();
	const Component = I18nComponents[language] as React.FunctionComponent|React.ComponentClass;
	return <div
		className = { less.footer }
	>
		<Component/>
	</div>;
} );

const I18nComponents = {
	'en-US' : reaxper( () => {
		return <>
			This application is powered by outstanding technical support from open-source libraries I developed, including <code>reaxes</code> , <code>reaxes-react</code> and <code>reaxel-i18n</code>.
		</>;
	} ) ,
	'zh-CN' : reaxper( () => {
		return <>
			此应用由本人开发的
			<code>reaxes</code>，
			<code>reaxes-react</code>，
			<code>reaxel-i18n</code>
			等系列开源库提供杰出技术支持
		</>;
	} ) ,
};

import { reaxel_I18n } from '#renderer/reaxels/i18n';
import * as less from './style.module.less';
