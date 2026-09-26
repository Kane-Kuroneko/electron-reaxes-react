/**
 * 出镜六家：bundled 目录里真实有的页，按 user-ais 数组序排。
 * 设计：docs/features/playwright-demo-script.md 、docs/architecture/ai-config.md
 */

export const DEMO_SHOWCASE_FAMILIES = [
	'chatgpt' ,
	'gemini' ,
	'claude' ,
	'deepseek' ,
	'grok' ,
	'perplexity',
] as const;

/** unpackaged dev 会注入；演示画像里删掉，避免 Switch AI 出现探测页。 */
export const DEV_PROXY_TEST_VENDOR_ID = 'f39b0b7e-f419-4a8d-bf92-82ebbe22a7cf';

export type DemoVendor = {
	id : string;
	family : string;
	label : string;
	url : string;
};

export const readBundledVendors = async( catalogPath:string ):Promise<DemoVendor[]> => {
	const raw = await fs.readFile( catalogPath , 'utf8' );
	const catalog = JSON.parse( raw ) as {
		ais? : DemoVendor[];
	};
	return ( catalog.ais || [] ).filter( ( vendor ) => {
		return typeof vendor.id === 'string'
			&& typeof vendor.family === 'string'
			&& typeof vendor.label === 'string'
			&& typeof vendor.url === 'string';
	} );
};

export const vendorByFamily = ( vendors:DemoVendor[] , family:string ) => {
	const vendor = vendors.find( ( item ) => item.family === family );
	if( !vendor ) {
		throw new Error( `bundled catalog missing family ${ family }` );
	}
	return vendor;
};

export const isShowcaseFamily = ( family:string ) => {
	return ( DEMO_SHOWCASE_FAMILIES as readonly string[] ).includes( family );
};

export const showcaseVendors = ( vendors:DemoVendor[] ) => {
	return DEMO_SHOWCASE_FAMILIES.map( ( family ) => vendorByFamily( vendors , family ) );
};

import fs from 'node:fs/promises';
