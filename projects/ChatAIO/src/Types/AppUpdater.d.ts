export namespace AppUpdater {
	export type Status =
		| 'idle'
		| 'checking'
		| 'available'
		| 'not-available'
		| 'downloading'
		| 'downloaded'
		| 'error';

	export type VersionTab = 'current' | 'latest';

	export type State = {
		status : Status;
		currentVersion : string;
		availableVersion : string | null;
		downloadProgress : number | null;
		error : string | null;
		updateAvailable : boolean;
	};

	export type ChangelogEntry = {
		version : string;
		body : string | null;
		error? : string | null;
	};

	export type Changelogs = {
		current : ChangelogEntry;
		latest : ChangelogEntry | null;
	};

	export type NavigatePayload = {
		/** About 页（含版本更新）；`version` 为旧别名，渲染侧映射到 about */
		menu : 'about' | 'version';
		versionTab? : VersionTab;
	};

	export type DownloadResult = {
		success : boolean;
		error? : string;
	};
}
