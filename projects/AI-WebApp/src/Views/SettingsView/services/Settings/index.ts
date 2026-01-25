export const submitSettings = (path:PatchPath<Config>,partialSettings:PatchData<PatchPath<Config>, Config>) => {
	return api.submitSettings(path,partialSettings);
}

export const fetchSettings = () => {
	return api.fetchSettings();
}
