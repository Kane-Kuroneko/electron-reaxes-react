import { createHookStealer } from "#renderer/WindowFrames/shared/utils/exper-outside-hooks";
import { useChat } from "#Main-Chat/rc/Chat/useChat";

export const {
	stealthCall : stolenChatId ,
	useStealthHook : useStealthChatId,
} = createHookStealer(() => {
	const {chat_id} = useChat();
	return { chat_id }
})
