export const createGuidingIpcService = () => {
	return {
		getDefaults : getGuidingDefaults ,
		saveProgress : guidingSaveProgress ,
		testConnectivity : guidingTestConnectivity ,
		getAppearanceEnvironment ,
		finish : guidingFinish,
	};
};

export const getGuidingDefaults = () => {
	return api.getGuidingDefaults();
};

export const guidingSaveProgress = (progress:Guiding.Progress) => {
	return api.guidingSaveProgress( progress );
};

export const guidingTestConnectivity = () => {
	return api.guidingTestConnectivity();
};

export const getAppearanceEnvironment = () => {
	return api.getAppearanceEnvironment();
};

export const guidingFinish = (options:Guiding.FinishOptions) => {
	return api.guidingFinish( options );
};

import type { Guiding } from '#src/Types/Guiding';
