import { NavigateFunction } from "react-router-dom";
import { createHooksTunnel } from "#renderer/WindowFrames/shared/utils/exper-hooks-tunnel";

export const {
	stealthCall : stealthNavigate,
	StealthHookComponent : Stealth_Navigate_HookComponent,
} = createHooksTunnel<(navigate:NavigateFunction) => void>();
