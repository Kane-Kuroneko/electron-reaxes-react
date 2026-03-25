declare global {
	// export const requester : typeof import('#src/requester').requester;
	export const _ : typeof import('lodash');
	export const reaxel : typeof import('reaxes')['reaxel'];
	export const createReaxable : typeof import('reaxes')['createReaxable'];
	export const distinctCallback : typeof import('reaxes')['distinctCallback'];
	export const obsReaction : typeof import('reaxes')['obsReaction'];
	export const collectDeps : typeof import('reaxes')['collectDeps'];
	export const reaxper : typeof import('reaxes-react')['reaxper'];
	export const Reaxlass : typeof import('reaxes-react')['Reaxlass'];
	export const useReaxable : typeof import('reaxes-react/hooks')['useReaxable'];
	
	export const utils : typeof import('#generics/utils');
	export const xPromise : typeof import('reaxes-utils')['xPromise'];
	export const xImport : typeof import('reaxes-utils')['xImport'];
	export const checkAs : typeof import('reaxes-utils/type-helpers')['checkAs'];
	export const notNull : typeof import('reaxes-utils/type-helpers')['notNull'];
	export const notFalse : typeof import('reaxes-utils/type-helpers')['notFalse'];
	export const crayon : typeof import('#generics/utils')['crayon'];
	export const logProxy : typeof import('#generics/utils')['logProxy'];
	export const makePair : typeof import('#generics/utils')['makePair'];
	export const assert : typeof import('#generics/utils')['assert'];
	export const decodeQueryString : typeof import('#generics/utils')['decodeQueryString'];
	export const encodeQueryString : typeof import('#generics/utils')['encodeQueryString'];
	export const stringify : typeof import('#generics/utils')['stringify'];
	
	export const __NODE_ENV__ : "development"|"production";
	export const __IS_MOCK__: boolean;
	export const __DEV_PORT__: number;
	export const __EXPERIMENTAL__: boolean;
	export const __METHOD__: "server"|"build";
	
	// export const React: typeof ReactModule;
	export const useLayoutEffect : typeof React.useLayoutEffect;
	export const useCallback : typeof React.useCallback;
	export const useState : typeof React.useState;
	export const useEffect : typeof React.useEffect;
	export const useRef : typeof React.useRef;
	
	namespace React {
		type R = typeof import('react');
		//@ts-expect-error
		export = R;
	}
	
	const __DEV__ : boolean;
	
	export const electron : {
		ipcRenderer : typeof import('electron')['ipcRenderer']
	}
}
import * as ReactModule from 'react';

export {}
