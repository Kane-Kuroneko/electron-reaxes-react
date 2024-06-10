
declare global {
	// export const requester : typeof import('#src/requester').requester;
	
	export const _ : typeof import('lodash');
	export const reaxel : typeof import('reaxes')['reaxel'];
	export const orzMobx : typeof import('reaxes')['orzMobx'];
	export const contrastedCallback : typeof import('reaxes')['Reaxes']['contrastedCallback'];
	export const obsReaction : typeof import('reaxes')['Reaxes']['obsReaction'];
	export const collectDeps : typeof import('reaxes')['Reaxes']['collectDeps'];
	export const reaxper : typeof import('reaxes-react')['reaxper'];
	export const crayon : typeof import('reaxes-utils')['crayon'];
	
	export const useEffect : typeof import('react').useEffect;
	export const useRef : typeof import('react').useRef;
	export const useMemo : typeof import('react').useMemo;
	export const useState : typeof import('react').useState;
}

export {}
