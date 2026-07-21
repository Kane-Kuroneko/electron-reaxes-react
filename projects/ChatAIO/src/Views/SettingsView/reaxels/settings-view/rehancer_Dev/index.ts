export const rehancer_Dev = ({store,setState,mutate}:Reaxel_SettingsView) => () => {
	setState.RootMenu({current:'net'});
}


import type {
	Reaxel_SettingsView,
} from '#SettingsView/reaxels/settings-view';
