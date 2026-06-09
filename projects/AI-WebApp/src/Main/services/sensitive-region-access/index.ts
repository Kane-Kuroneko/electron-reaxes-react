export type SensitiveRegionAccessResult = {
	allowed: boolean;
	loadURL: string;
	targetURL: string;
	policyKey: string;
	reason: SensitiveRegionBlockReason | null;
	probe: SensitiveRegionProbeResult | null;
	errors: string[];
};

export type SensitiveRegionBlockReason = 'sensitive-region' | 'probe-failed';

export type SensitiveRegionProbeResult = {
	providerId: string;
	ipAddress: string | null;
	countryCode: string;
	countryName: string | null;
};

type ResolveSensitiveRegionAccessOptions = {
	ai: Pick<AI.AIItem , 'id' | 'label' | 'blockSensitiveRegionAccess'>;
	session: Session;
	targetURL: string;
	proxyKey: string;
};

type RegionProbeProvider = {
	id: string;
	url: string;
	parse(text:string): SensitiveRegionProbeResult | null;
};

const DEFAULT_SENSITIVE_REGION_COUNTRY_CODES = [
	'CN' ,
	'CU' ,
	'IR' ,
	'KP' ,
	'RU' ,
	'SY' ,
	'BY',
];

const REGION_PROBE_TIMEOUT_MS = 4200;
const REGION_PROBE_CACHE_TTL_MS = 5 * 60 * 1000;
const REGION_PROBE_FAILURE_CACHE_TTL_MS = 20 * 1000;

const regionProbeProviders:RegionProbeProvider[] = [
	{
		id : 'cloudflare-trace' ,
		url : 'https://www.cloudflare.com/cdn-cgi/trace' ,
		parse : parseCloudflareTrace,
	} ,
	{
		id : 'ipapi' ,
		url : 'https://ipapi.co/json/' ,
		parse : parseIpApi,
	} ,
	{
		id : 'ipwhois' ,
		url : 'https://ipwho.is/' ,
		parse : parseIpWhoIs,
	},
];

const probeCache = new Map<string , {
	expiresAt: number;
	result: RegionProbeAttemptResult;
}>();

export const getSensitiveRegionAccessPolicyKey = (
	ai:Pick<AI.AIItem , 'blockSensitiveRegionAccess'> ,
	proxyKey:string,
) => {
	return JSON.stringify( {
		enabled : ai.blockSensitiveRegionAccess === true ,
		countryCodes : DEFAULT_SENSITIVE_REGION_COUNTRY_CODES ,
		proxyKey,
	} );
};

export const resolveSensitiveRegionAccess = async(
	options:ResolveSensitiveRegionAccessOptions,
):Promise<SensitiveRegionAccessResult> => {
	const policyKey = getSensitiveRegionAccessPolicyKey( options.ai , options.proxyKey );
	if( options.ai.blockSensitiveRegionAccess !== true ) {
		return {
			allowed : true ,
			loadURL : options.targetURL ,
			targetURL : options.targetURL ,
			policyKey ,
			reason : null ,
			probe : null ,
			errors : [],
		};
	}
	
	const probeAttempt = await probeOutboundIPRegion(
		options.session ,
		options.proxyKey,
	);
	if( probeAttempt.probe ) {
		const countryCode = normalizeCountryCode( probeAttempt.probe.countryCode );
		if( DEFAULT_SENSITIVE_REGION_COUNTRY_CODES.includes( countryCode ) ) {
			return createBlockedResult( {
				...options ,
				policyKey ,
				reason : 'sensitive-region' ,
				probe : probeAttempt.probe ,
				errors : probeAttempt.errors,
			} );
		}
		return {
			allowed : true ,
			loadURL : options.targetURL ,
			targetURL : options.targetURL ,
			policyKey ,
			reason : null ,
			probe : probeAttempt.probe ,
			errors : probeAttempt.errors,
		};
	}
	
	return createBlockedResult( {
		...options ,
		policyKey ,
		reason : 'probe-failed' ,
		probe : null ,
		errors : probeAttempt.errors,
	} );
};

const probeOutboundIPRegion = async(
	session:Session ,
	cacheKey:string,
):Promise<RegionProbeAttemptResult> => {
	const cached = probeCache.get( cacheKey );
	if( cached && cached.expiresAt > Date.now() ) {
		return cached.result;
	}
	const result = await runRegionProbeProviders( session );
	probeCache.set( cacheKey , {
		expiresAt : Date.now() + ( result.probe ? REGION_PROBE_CACHE_TTL_MS : REGION_PROBE_FAILURE_CACHE_TTL_MS ) ,
		result,
	} );
	return result;
};

const runRegionProbeProviders = async(session:Session):Promise<RegionProbeAttemptResult> => {
	const errors:string[] = [];
	for( const provider of regionProbeProviders ) {
		try {
			const responseText = await fetchProbeProvider( session , provider );
			const probe = provider.parse( responseText );
			if( probe?.countryCode ) {
				return {
					probe : {
						...probe ,
						countryCode : normalizeCountryCode( probe.countryCode ),
					} ,
					errors,
				};
			}
			errors.push( `${ provider.id }: response did not contain country code` );
		} catch ( error ) {
			errors.push( `${ provider.id }: ${ stringifyUnknownError( error ) }` );
		}
	}
	return {
		probe : null ,
		errors,
	};
};

const fetchProbeProvider = async(
	session:Session ,
	provider:RegionProbeProvider,
) => {
	const controller = new AbortController();
	const timer = setTimeout( () => controller.abort() , REGION_PROBE_TIMEOUT_MS );
	try {
		const response = await session.fetch( provider.url , {
			method : 'GET' ,
			signal : controller.signal ,
			headers : {
				'Cache-Control' : 'no-cache',
				'Pragma' : 'no-cache',
			},
		} );
		if( response.status < 200 || response.status >= 400 ) {
			throw new Error( `HTTP ${ response.status }` );
		}
		return await response.text();
	} finally {
		clearTimeout( timer );
	}
};

function parseCloudflareTrace(text:string):SensitiveRegionProbeResult | null {
	const data = text.split( /\r?\n/g ).reduce<Record<string , string>>( ( result , line ) => {
		const index = line.indexOf( '=' );
		if( index === -1 ) {
			return result;
		}
		result[line.slice( 0 , index )] = line.slice( index + 1 );
		return result;
	} , {} );
	const countryCode = normalizeCountryCode( data.loc );
	if( !countryCode ) {
		return null;
	}
	return {
		providerId : 'cloudflare-trace' ,
		ipAddress : data.ip || null ,
		countryCode ,
		countryName : getCountryDisplayName( countryCode ),
	};
}

function parseIpApi(text:string):SensitiveRegionProbeResult | null {
	const data = parseJSON<Record<string , any>>( text );
	const countryCode = normalizeCountryCode( data?.country_code );
	if( !countryCode ) {
		return null;
	}
	return {
		providerId : 'ipapi' ,
		ipAddress : typeof data.ip === 'string' ? data.ip : null ,
		countryCode ,
		countryName : typeof data.country_name === 'string' ? data.country_name : getCountryDisplayName( countryCode ),
	};
}

function parseIpWhoIs(text:string):SensitiveRegionProbeResult | null {
	const data = parseJSON<Record<string , any>>( text );
	if( data?.success === false ) {
		return null;
	}
	const countryCode = normalizeCountryCode( data?.country_code );
	if( !countryCode ) {
		return null;
	}
	return {
		providerId : 'ipwhois' ,
		ipAddress : typeof data.ip === 'string' ? data.ip : null ,
		countryCode ,
		countryName : typeof data.country === 'string' ? data.country : getCountryDisplayName( countryCode ),
	};
}

const createBlockedResult = (
	options:ResolveSensitiveRegionAccessOptions & {
		policyKey: string;
		reason: SensitiveRegionBlockReason;
		probe: SensitiveRegionProbeResult | null;
		errors: string[];
	},
):SensitiveRegionAccessResult => {
	return {
		allowed : false ,
		loadURL : createSensitiveRegionBlockPageURL( options ) ,
		targetURL : options.targetURL ,
		policyKey : options.policyKey ,
		reason : options.reason ,
		probe : options.probe ,
		errors : options.errors,
	};
};

const createSensitiveRegionBlockPageURL = (
	options:ResolveSensitiveRegionAccessOptions & {
		reason: SensitiveRegionBlockReason;
		probe: SensitiveRegionProbeResult | null;
		errors: string[];
	},
) => {
	const countryCode = options.probe?.countryCode || 'Unknown';
	const countryName = options.probe?.countryName || getCountryDisplayName( countryCode ) || 'Unknown';
	const ipAddress = options.probe?.ipAddress || 'Unknown';
	const reasonText = options.reason === 'sensitive-region'
		? `The detected country/region (${ countryCode }) is in the sensitive region list.`
		: 'The app could not verify the outbound IP country/region, so remote loading was blocked.';
	const errorItems = options.errors.slice( 0 , 4 ).map( error => {
		return `<li>${ escapeHTML( error ) }</li>`;
	} ).join( '' );
	const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI page blocked</title>
<style>
:root { color-scheme: light dark; }
body {
	margin: 0;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	background: #f7f8fa;
	color: #1f2328;
}
main {
	max-width: 760px;
	margin: 0 auto;
	padding: 56px 28px;
}
.panel {
	border: 1px solid #d0d7de;
	border-radius: 8px;
	background: #ffffff;
	padding: 28px;
	box-shadow: 0 8px 28px rgba(31, 35, 40, 0.08);
}
h1 {
	margin: 0 0 12px;
	font-size: 24px;
	line-height: 1.25;
}
p {
	margin: 8px 0;
	line-height: 1.55;
}
dl {
	display: grid;
	grid-template-columns: 160px 1fr;
	gap: 8px 14px;
	margin: 22px 0 0;
}
dt {
	color: #57606a;
}
dd {
	margin: 0;
	word-break: break-all;
}
.reason {
	margin-top: 18px;
	padding: 12px 14px;
	border-left: 4px solid #d1242f;
	background: #fff1f1;
}
ul {
	margin: 10px 0 0;
	padding-left: 20px;
	color: #57606a;
}
@media (prefers-color-scheme: dark) {
	body {
		background: #111417;
		color: #e6edf3;
	}
	.panel {
		background: #161b22;
		border-color: #30363d;
		box-shadow: none;
	}
	dt,
	ul {
		color: #8b949e;
	}
	.reason {
		background: rgba(248, 81, 73, 0.14);
	}
}
</style>
</head>
<body>
<main>
<section class="panel">
<h1>AI page blocked</h1>
<p>Sensitive Region Protection is enabled for this AI page. The remote AI URL was not loaded.</p>
<div class="reason">${ escapeHTML( reasonText ) }</div>
<dl>
<dt>AI page</dt><dd>${ escapeHTML( options.ai.label || options.ai.id ) }</dd>
<dt>Target URL</dt><dd>${ escapeHTML( options.targetURL ) }</dd>
<dt>Detected IP</dt><dd>${ escapeHTML( ipAddress ) }</dd>
<dt>Detected country</dt><dd>${ escapeHTML( countryName ) } (${ escapeHTML( countryCode ) })</dd>
<dt>Probe provider</dt><dd>${ escapeHTML( options.probe?.providerId || 'Unavailable' ) }</dd>
</dl>
${ errorItems ? `<ul>${ errorItems }</ul>` : '' }
<p>Change this AI page proxy or disable Sensitive Region Protection, then reload the page.</p>
</section>
</main>
</body>
</html>`;
	return `data:text/html;charset=utf-8,${ encodeURIComponent( html ) }`;
};

const normalizeCountryCode = (countryCode:unknown) => {
	return typeof countryCode === 'string'
		? countryCode.trim().toUpperCase()
		: '';
};

const getCountryDisplayName = (countryCode:string) => {
	return SENSITIVE_REGION_COUNTRY_NAMES[countryCode] || null;
};

const parseJSON = <T>(text:string):T | null => {
	try {
		return JSON.parse( text ) as T;
	} catch ( error ) {
		return null;
	}
};

const escapeHTML = (value:unknown) => {
	return String( value )
		.replace( /&/g , '&amp;' )
		.replace( /</g , '&lt;' )
		.replace( />/g , '&gt;' )
		.replace( /"/g , '&quot;' )
		.replace( /'/g , '&#39;' );
};

const stringifyUnknownError = (error:unknown) => {
	return error instanceof Error ? error.message : String( error );
};

type RegionProbeAttemptResult = {
	probe: SensitiveRegionProbeResult | null;
	errors: string[];
};

const SENSITIVE_REGION_COUNTRY_NAMES:Record<string , string> = {
	BY : 'Belarus' ,
	CN : 'Mainland China' ,
	CU : 'Cuba' ,
	IR : 'Iran' ,
	KP : 'North Korea' ,
	RU : 'Russia' ,
	SY : 'Syria',
};

import type { AI } from '#src/Types/SettingsTypes/AI';
import type { Session } from 'electron';
