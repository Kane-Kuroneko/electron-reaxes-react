/**
 * Exit Without Save 丢掉 runtime 草稿，保留 Manage AIs 表草稿。
 * 对应 docs/features/settings-exit-discard-and-prompt-scrollbar.md
 */

test( 'Exit Without Save reverts theme but keeps unsaved Enabled draft' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await expectTableIdle( settings );
	await openGeneral( settings );
	await watchClick( settings.getByRole( 'radio' , { name : 'Dark' } ) );
	await expectFooterDirty( settings );
	await openManageAIs( settings );
	await watchClick( enabledSwitchInRow( settings , E2E_AI_B.id ) );
	await expectTableDirty( settings );

	await exitSettingsWithoutSave( electronApp , settings );

	const again = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openGeneral( again );
	await expect( again.getByRole( 'radio' , { name : 'Light' , exact : true } ) ).toBeChecked();
	await expectFooterIdle( again );
	await openManageAIs( again );
	await expect( enabledSwitchInRow( again , E2E_AI_B.id ) ).toBeChecked();
	await expectTableDirty( again );

	const disk = await readUserAisFile( userDataDir );
	expect( disk.ais.find( ( ai ) => ai.id === E2E_AI_B.id )?.disabled ).toBe( true );
} );

import { test , expect } from '../fixtures';
import {
	exitSettingsWithoutSave ,
	openSettingsFromApplicationMenu,
} from '../support/app-probe';
import { E2E_AI_B } from '../support/e2e-ais';
import { watchClick } from '../support/observe';
import { readUserAisFile } from '../support/user-ais-file';
import {
	enabledSwitchInRow ,
	expectFooterDirty ,
	expectFooterIdle ,
	expectTableDirty ,
	expectTableIdle ,
	openGeneral ,
	openManageAIs,
} from '../support/settings-ui';
