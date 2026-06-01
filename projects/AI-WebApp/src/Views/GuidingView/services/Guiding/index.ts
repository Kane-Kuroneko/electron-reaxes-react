export const createGuidingIpcService = () => {
	return {
		getDefaults : () => api.getGuidingDefaults() ,
		saveProgress : (progress:Guiding.Progress) => api.guidingSaveProgress( progress ) ,
		testConnectivity : () => api.guidingTestConnectivity() ,
		finish : (options:Guiding.FinishOptions) => api.guidingFinish( options ),
	};
};

import type { Guiding } from '#src/Types/Guiding';
