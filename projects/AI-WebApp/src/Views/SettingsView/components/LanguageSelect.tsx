export const RCLanguageSelect = (props:{
	value: Appearance.Language;
	systemLanguage: Languages;
	onChange: (value:Appearance.Language) => void;
	style?: any;
}) => {
	const {
		value ,
		systemLanguage ,
		onChange ,
		style,
	} = props;
	
	return <Select
		className="settings-language-select"
		value={ value }
		onChange={ onChange }
		options={ createLanguageOptions( systemLanguage ) }
		optionRender={ option => renderLanguageOption( option as any , systemLanguage ) }
		labelRender={ item => renderLanguageSelectedLabel( item.value as Appearance.Language , systemLanguage ) }
		style={ {
			minWidth : 240 ,
			...style,
		} }
	/>;
};

const createLanguageOptions = (systemLanguage:Languages) => [
	{
		value : 'follow-system' ,
		label : `Follow System (${ getLanguageDisplayName( systemLanguage ) })`,
	} ,
	{ value : 'en-US' , label : 'English' } ,
	{ value : 'zh-CN' , label : '简体中文' } ,
	{ value : 'zh-TW' , label : '正體中文' } ,
	{ value : 'ja-JP' , label : '日本語' } ,
	{ value : 'ko-KR' , label : '한국어' },
];

const renderLanguageOption = (option:any , systemLanguage:Languages) => {
	if( option.data.value === 'follow-system' ) {
		return <span>
			<I18n>Follow System</I18n>
			<br />
			<span className="select-option-subtitle">{ getLanguageDisplayName( systemLanguage ) }</span>
		</span>;
	}
	return option.data.label;
};

const renderLanguageSelectedLabel = (
	value:Appearance.Language ,
	systemLanguage:Languages,
) => {
	if( value === 'follow-system' ) {
		return <span className="settings-language-select__selected">
			<I18n>Follow System</I18n> ({ getLanguageDisplayName( systemLanguage ) })
		</span>;
	}
	return getLanguageDisplayName( value as Languages );
};

import { getLanguageDisplayName } from '#src/shared/appearance';
import type { Languages } from '#src/Types/Languages';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
import { Select } from 'antd';
