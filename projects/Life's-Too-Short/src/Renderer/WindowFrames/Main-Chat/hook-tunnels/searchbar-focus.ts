import { createHookStealer } from "#renderer/WindowFrames/shared/utils/exper-outside-hooks";
import { RefSelectProps } from "antd";

export const {
	stealthCall : stealthSearchBarFocus ,
	useStealthHook : useStealthSearchBarFocus ,
} = createHookStealer(() => {
	const ref = useRef<RefSelectProps>(null);
	return {
		ref ,
		focus(){
			ref.current?.focus();
		}
	}
})
