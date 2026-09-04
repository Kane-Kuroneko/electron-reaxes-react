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
	expect( await userAisFileExists( userDataDir ) ).toBe( true );
	const aisBefore = await readUserAisFile( userDataDir );
	const diskBefore = await readUserSettingsFile( userDataDir );
	expect( diskBefore.settings.startup.aiPageLoadMode ).toBe( 'last-used-ai' );

	const result = await e2eApplySettingsMutateInMain( electronApp , {
		aiPageLoadMode : 'first-ai' ,
		disableAllAIs : true,
	} );
	expect( result.success ).toBe( true );
	expect( result.requested ).toBe( 'first-ai' );
	expect( result.afterAiPageLoadMode ).toBe( 'first-ai' );
	expect( result.userData ).toBe( userDataDir );

	const deadline = Date.now() + 10_000;
	let afterSettings = await e2eGetSettings( electronApp );
	let diskSettings = await readUserSettingsFile( userDataDir );
	while( Date.now() < deadline ) {
		if(
			afterSettings.startup.aiPageLoadMode === 'first-ai'
			&& diskSettings.settings.startup.aiPageLoadMode === 'first-ai'
		) {
			break;
		}
		await new Promise<void>( ( resolve ) => setTimeout( resolve , 200 ) );
		afterSettings = await e2eGetSettings( electronApp );
		diskSettings = await readUserSettingsFile( userDataDir );
	}
	expect( afterSettings.startup.aiPageLoadMode ).toBe( 'first-ai' );
	expect( fingerprintAIs( afterSettings.AIs ) ).toBe( aisFingerprint );
	expect( persistedIdsOf( await readUserAisFile( userDataDir ) ) ).toEqual( persistedIdsOf( aisBefore ) );
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

	const applyResult = await e2eApplyAIsDisableInMain( electronApp , targetId! );
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
	e2eApplyAIsDisableInMain ,
	e2eApplySettingsMutateInMain ,
	e2eGetSettings ,
	e2eUpdateAI ,
	waitForE2ESnapshot,
} from '../support/app-probe';
import { persistedIdsOf , readUserAisFile , userAisFileExists } from '../support/user-ais-file';
import fs from 'node:fs/promises';
import path from 'node:path';
