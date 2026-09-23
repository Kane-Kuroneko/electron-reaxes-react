/**
 * Wipe 清当前 AI persist partition 的全部 cookie（含父域 SSO），不动其它 AI 页。
 * 触发走 View 菜单，不调用 wipeAndReloadCurrentAIView；种/读 cookie 走 Electron session.cookies。
 * 不打开 Google / ChatGPT 远程页。
 * 见 docs/issues/wipe-reload-cross-origin-session.md
 */

const ALPHA_SITE = {
	url : 'https://aistudio.google.com/' ,
	name : 'e2e-studio' ,
	value : 'alpha-site' ,
	domain : 'aistudio.google.com',
};

const ALPHA_GOOGLE_SSO = {
	url : 'https://accounts.google.com/' ,
	name : 'e2e-google-sso' ,
	value : 'alpha-google-sso' ,
	domain : '.google.com',
};

const ALPHA_OTHER_ORIGIN = {
	url : 'https://example.com/' ,
	name : 'e2e-other-origin' ,
	value : 'alpha-other' ,
	domain : 'example.com',
};

const CHARLIE_SITE = {
	url : 'https://chatgpt.com/' ,
	name : 'e2e-chatgpt' ,
	value : 'charlie-site' ,
	domain : 'chatgpt.com',
};

const CHARLIE_GOOGLE_SSO = {
	url : 'https://accounts.google.com/' ,
	name : 'e2e-google-sso' ,
	value : 'charlie-google-sso' ,
	domain : '.google.com',
};

test( 'wipe current AI partition clears parent-domain cookies and leaves the other AI page' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const start = await waitForMainRuntime( electronApp );
	expect( start.currentAIViewKey ).toBe( E2E_AI_A.id );

	await switchToAiById( electronApp , mainWindow , E2E_AI_C.id );
	await switchToAiById( electronApp , mainWindow , E2E_AI_A.id );
	const bothOpen = await waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.currentAIViewKey === E2E_AI_A.id
				&& state.instantiatedAIIds.includes( E2E_AI_A.id )
				&& state.instantiatedAIIds.includes( E2E_AI_C.id );
		},
	);
	expect( bothOpen.instantiatedAIIds ).toEqual( [ E2E_AI_A.id , E2E_AI_C.id ] );

	await e2ePlantAIPartitionCookies( electronApp , E2E_AI_A.id , [
		ALPHA_SITE ,
		ALPHA_GOOGLE_SSO ,
		ALPHA_OTHER_ORIGIN,
	] );
	await e2ePlantAIPartitionCookies( electronApp , E2E_AI_C.id , [
		CHARLIE_SITE ,
		CHARLIE_GOOGLE_SSO,
	] );

	expect( cookieValues( await e2eListAIPartitionCookies( electronApp , E2E_AI_A.id ) ) ).toEqual(
		expect.arrayContaining( [
			ALPHA_SITE.value ,
			ALPHA_GOOGLE_SSO.value ,
			ALPHA_OTHER_ORIGIN.value,
		] ),
	);
	expect( cookieValues( await e2eListAIPartitionCookies( electronApp , E2E_AI_C.id ) ) ).toEqual(
		expect.arrayContaining( [
			CHARLIE_SITE.value ,
			CHARLIE_GOOGLE_SSO.value,
		] ),
	);

	const dropdown = await openTopMenuUntilItem(
		electronApp ,
		mainWindow ,
		MENU_IDS.view ,
		MENU_IDS.wipeReload,
	);
	await clickClosingDropdownItem( electronApp , dropdownItem( dropdown , MENU_IDS.wipeReload ) );

	await expect.poll( async() => {
		return e2eMarkerValues( await e2eListAIPartitionCookies( electronApp , E2E_AI_A.id ) );
	} ).toEqual( [] );

	expect( cookieValues( await e2eListAIPartitionCookies( electronApp , E2E_AI_C.id ) ) ).toEqual(
		expect.arrayContaining( [
			CHARLIE_SITE.value ,
			CHARLIE_GOOGLE_SSO.value,
		] ),
	);
} );

const cookieValues = ( cookies:{ name:string; value:string }[] ) => {
	return cookies.map( ( cookie ) => cookie.value );
};

const e2eMarkerValues = ( cookies:{ name:string; value:string }[] ) => {
	return cookies
		.filter( ( cookie ) => cookie.name.startsWith( 'e2e-' ) )
		.map( ( cookie ) => cookie.value )
		.sort();
};

import { test , expect } from '../fixtures';
import {
	clickClosingDropdownItem ,
	dropdownItem ,
	e2eListAIPartitionCookies ,
	e2ePlantAIPartitionCookies ,
	openTopMenuUntilItem ,
	waitForE2ESnapshot ,
	waitForMainRuntime,
} from '../support/app-probe';
import { E2E_AI_A , E2E_AI_C } from '../support/e2e-ais';
import { switchToAiById } from '../support/switch-ai';
import { MENU_IDS } from '../support/selectors';
