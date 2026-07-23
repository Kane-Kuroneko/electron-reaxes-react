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
		menu : 'version';
		versionTab? : VersionTab;
	};

	export type DownloadResult = {
		success : boolean;
		error? : string;
	};
}
