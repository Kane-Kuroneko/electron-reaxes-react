export const ModelPicker = reaxper( () => {
	
	return <WheeledPicker
		options={LLMModels}
		value={ reaxel_UserChatInput.store.select_UserSelectedLLM }
		onSelect={(value) => {
			reaxel_UserChatInput.setState( { select_UserSelectedLLM : value } );
		}}
		title="Response LLM model"
	/>;
} );


import { LLMModels } from '#src/shared/LLM-Models';
import { WheeledPicker } from "#renderer/WindowFrames/shared/rc/Wheeled-Picker";
import { reaxel_UserChatInput } from "#Main-Chat/reaxels/user-chat-input";
