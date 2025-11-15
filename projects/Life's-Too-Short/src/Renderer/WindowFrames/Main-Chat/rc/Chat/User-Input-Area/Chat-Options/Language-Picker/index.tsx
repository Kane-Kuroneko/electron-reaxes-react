const languageOptions = Object.keys( languages ).map( ( k: keyof typeof languages ) => {
	const {
		englishName ,
		nativeName ,
		legacyCode ,
	} = languages[k];
	return {
		label : nativeName ,
		value : legacyCode ,
	};
} );

export const LanguagePicker = reaxper( () => {
	
	return <WheeledPicker
		options={ languageOptions }
		value={ reaxel_UserChatInput.store.select_UserSelectedLanguage }
		onSelect={ ( value ) => {
			reaxel_UserChatInput.setState( { select_UserSelectedLanguage : value } );
		} }
		title="Response language"
	/>;
} );


import { WheeledPicker } from "#renderer/WindowFrames/shared/rc/Wheeled-Picker";
import { languages } from "#generic/refaxels/i18n";
import { reaxel_UserChatInput } from "#Main-Chat/reaxels/user-chat-input";
