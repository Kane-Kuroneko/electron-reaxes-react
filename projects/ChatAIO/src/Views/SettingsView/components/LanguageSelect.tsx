export const RCLanguageSelect = (props:{
	value: Appearance.Language;
	systemLanguage: Languages;
	onChange: (value:Appearance.Language) => void;
	className?: string;
}) => {
	return <SimpleSelect
		className={ cn( 'min-w-[240px]' , props.className ) }
		value={ props.value }
		onValueChange={ ( value ) => props.onChange( value as Appearance.Language ) }
		options={ createLanguageOptions( props.systemLanguage ) }
	/>;
};

const createLanguageOptions = (systemLanguage:Languages) => [
	{
		value : 'follow-system' ,
		label : `${ i18n( 'Follow System' ) } (${ getLanguageDisplayName( systemLanguage ) })`,
	} ,
	{ value : 'en-US' , label : 'English' } ,
	{ value : 'zh-CN' , label : '简体中文' } ,
	{ value : 'zh-TW' , label : '正體中文' } ,
	{ value : 'ja-JP' , label : '日本語' } ,
	{ value : 'ko-KR' , label : '한국어' },
];

import { getLanguageDisplayName } from '#shared/appearance';
import type { Languages } from '#src/Types/Languages';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
import { cn } from '#Views/shared/ui/cn.utility';
import { SimpleSelect } from '#Views/shared/ui/select';
