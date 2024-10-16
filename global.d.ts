declare global {
	// export const requester : typeof import('#src/requester').requester;
	
	export const _ : typeof import('lodash');
	export const reaxel : typeof import('reaxes')['reaxel'];
	export const orzMobx : typeof import('reaxes')['orzMobx'];
	export const contrastedCallback : typeof import('reaxes')['Reaxes']['contrastedCallback'];
	export const obsReaction : typeof import('reaxes')['Reaxes']['obsReaction'];
	export const collectDeps : typeof import('reaxes')['Reaxes']['collectDeps'];
	export const reaxper : typeof import('reaxes-react')['reaxper'];
	
	export const utils : typeof import('#generic/utils')['crayon'];
	export const orzPromise : typeof import('#generic/utils').orzPromise;
	export const crayon : typeof import('#generic/utils').crayon;
	export const logProxy : typeof import('#generic/utils').logProxy;
	export const makePair : typeof import('#generic/utils').makePair;
	export const assert : typeof import('#generic/utils').assert;
	export const decodeQueryString : typeof import('#generic/utils').decodeQueryString;
	export const encodeQueryString : typeof import('#generic/utils').encodeQueryString;
	export const stringify : typeof import('#generic/utils').stringify;
	
	export const useEffect : typeof import('react').useEffect;
	export const useRef : typeof import('react').useRef;
	export const useMemo : typeof import('react').useMemo;
	export const useState : typeof import('react').useState;
	
	
	export const electron : {
		ipcRenderer : typeof import('electron').ipcRenderer
	}
}

export {}
