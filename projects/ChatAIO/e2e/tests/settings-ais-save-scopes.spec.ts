/**
 * Manage AIs / Settings 两套提交：Playwright 进不了 Settings WCV，
 * 用主进程探针测 persist 契约。见 docs/features/manage-ais-save-scopes.md
 */

test( 'apply-settings writes runtime but ignores AIs in the payload' , async( {
	electronApp ,
	userDataDir,
} ) => {
	const snapshot = await waitForSaveScopesReady( electronApp );
	const settings = await e2eGetSettings( electronApp );
	expect( settings.AIs.length ).toBeGreaterThan( 1 );
	const aisFingerprint = fingerprintAIs( settings.AIs );
	expect( await userAisFileExists( userDataDir ) ).toBe( false );
	expect( settings.startup.aiPageLoadMode ).toBe( 'last-used-ai' );

	const poisoned = JSON.parse( JSON.stringify( settings ) ) as typeof settings;
	poisoned.startup = {
		...poisoned.startup ,
		aiPageLoadMode : 'first-ai',
	};
	poisoned.AIs = poisoned.AIs.map( ( ai ) => {
		return {
			...ai ,
			disabled : true,
		};
	} );

	const result = await e2eApplySettings( electronApp , poisoned );
	expect( result.success ).toBe( true );

	const afterSettings = await e2eGetSettings( electronApp );
	expect( afterSettings.startup.aiPageLoadMode ).toBe( 'first-ai' );
	expect( fingerprintAIs( afterSettings.AIs ) ).toBe( aisFingerprint );
	expect( await userAisFileExists( userDataDir ) ).toBe( false );

	const diskSettings = await readUserSettingsFile( userDataDir );
	expect( diskSettings.settings.startup.aiPageLoadMode ).toBe( 'first-ai' );
	expect( diskSettings.settings ).not.toHaveProperty( 'AIs' );

	const after = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.enabledAIIds.length === snapshot.enabledAIIds.length,
	);
	expect( after.enabledAIIds ).toEqual( snapshot.enabledAIIds );
} );

test( 'apply-ais persists enabled flags; update-ai patches one row without taking disabled' , async( {
	electronApp ,
	userDataDir,
} ) => {
	const snapshot = await waitForSaveScopesReady( electronApp );
	const settings = await e2eGetSettings( electronApp );
	const targetId = snapshot.enabledAIIds.find( ( id ) => id !== snapshot.currentAIViewKey );
	expect( targetId ).toBeTruthy();
	const sibling = settings.AIs.find( ( ai ) => ai.id !== targetId && ai.disabled !== true );
	expect( sibling ).toBeTruthy();
	const siblingLabel = sibling!.label;

	const nextAIs = JSON.parse( JSON.stringify( settings.AIs ) ).map( ( ai:{ id:string; disabled?:boolean } ) => {
		return {
			...ai ,
			disabled : ai.id === targetId ? true : ai.disabled === true,
		};
	} );
	const applyResult = await e2eApplyAIs( electronApp , nextAIs );
	expect( applyResult.success ).toBe( true );

	const afterDisable = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.enabledAIIds.includes( targetId! ) === false,
	);
	expect( afterDisable.enabledAIIds ).not.toContain( targetId );
	expect( afterDisable.enabledAIIds ).toContain( sibling!.id );

	const userAis = await readUserAisFile( userDataDir );
	const persistedTarget = userAis.ais.find( ( ai ) => ai.id === targetId );
	expect( persistedTarget?.disabled ).toBe( true );
	const persistedSibling = userAis.ais.find( ( ai ) => ai.id === sibling!.id );
	expect( persistedSibling?.disabled ).not.toBe( true );

	const renamed = `${ siblingLabel }-e2e`;
	const updated = await e2eUpdateAI( electronApp , sibling!.id , {
		label : renamed ,
		disabled : true,
	} );
	expect( updated ).toBeTruthy();
	expect( updated!.label ).toBe( renamed );
	expect( updated!.disabled ).not.toBe( true );

	const afterRename = await e2eGetSettings( electronApp );
	const liveSibling = afterRename.AIs.find( ( ai ) => ai.id === sibling!.id );
	const liveTarget = afterRename.AIs.find( ( ai ) => ai.id === targetId );
	expect( liveSibling?.label ).toBe( renamed );
	expect( liveSibling?.disabled ).not.toBe( true );
	expect( liveTarget?.disabled ).toBe( true );

	const userAisAfter = await readUserAisFile( userDataDir );
	expect( userAisAfter.ais.find( ( ai ) => ai.id === sibling!.id )?.label ).toBe( renamed );
	expect( userAisAfter.ais.find( ( ai ) => ai.id === sibling!.id )?.disabled ).not.toBe( true );
	expect( userAisAfter.ais.find( ( ai ) => ai.id === targetId )?.disabled ).toBe( true );
} );

const waitForSaveScopesReady = ( electronApp:Parameters<typeof waitForE2ESnapshot>[0] ) => {
	return waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.kind === 'main'
				&& state.runtimeViewsReady === true
				&& state.enabledAIIds.length > 1
				&& state.currentAIViewKey.length > 0;
		} ,
		45_000,
	);
};

const fingerprintAIs = ( ais:{ id:string; disabled?:boolean }[] ) => {
	return [ ...ais ]
		.map( ( ai ) => `${ ai.id }:${ ai.disabled === true ? 1 : 0 }` )
		.sort()
		.join( '|' );
};

const userAisPath = ( userDataDir:string ) => {
	return path.join( userDataDir , 'user-ais.json' );
};

const userAisFileExists = async( userDataDir:string ) => {
	try {
		await fs.access( userAisPath( userDataDir ) );
		return true;
	} catch {
		return false;
	}
};

const readUserAisFile = async( userDataDir:string ) => {
	const raw = await fs.readFile( userAisPath( userDataDir ) , 'utf8' );
	return JSON.parse( raw ) as {
		ais : { id:string; label:string; disabled?:boolean }[];
	};
};

const readUserSettingsFile = async( userDataDir:string ) => {
	const raw = await fs.readFile( path.join( userDataDir , 'user-settings.json' ) , 'utf8' );
	return JSON.parse( raw ) as {
		settings : {
			appearance : { theme:string };
			startup : { aiPageLoadMode:string };
			AIs? : unknown;
		};
	};
};

import { test , expect } from '../fixtures';
import {
	e2eApplyAIs ,
	e2eApplySettings ,
	e2eGetSettings ,
	e2eUpdateAI ,
	waitForE2ESnapshot,
} from '../support/app-probe';
import fs from 'node:fs/promises';
import path from 'node:path';
