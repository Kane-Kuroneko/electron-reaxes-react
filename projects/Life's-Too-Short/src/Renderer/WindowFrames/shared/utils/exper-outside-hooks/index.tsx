import { useNavigate } from "react-router-dom";

export const createHooksTunnel = <
	Props,
	HookFn extends (props: Props) => any,
	Rtn = ReturnType<HookFn>
>(hook: HookFn) => {
	const { store, setState } = createReaxable({
		internal: null as <T>(fn: (hookRtn: Rtn) => T) => T,
	});
	
	return {
		stealthCall<T>(fn: (hookRtn: Rtn) => T): T | undefined {
			return store.internal?.(fn);
		},
		useStealthHook(props: Props) {
			const rtn = hook(props);
			setState({
				internal: (fn) => fn(rtn),
			});
		},
	};
};

export const { stealthCall, useStealthHook } = createHooksTunnel(
	(props: { chat_id: string }) => {
		const navigate = useNavigate();
		return { navigate };
	}
);

const rtn = stealthCall(({ navigate }) => {
	// navigate 是强类型的
	return 111;
});


