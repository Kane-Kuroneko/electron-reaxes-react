/**
 * ChatAIO 产品演示导演。OBS 录屏用，不是 E2E。
 * 默认 playlist：switch-ai → prompt → settings（不出 Guiding / Dark）。
 * 设计：docs/features/playwright-demo-record.md 、docs/features/playwright-demo-script.md
 */

const main = async() => {
	const args = parseArgs( process.argv.slice( 2 ) );
	if( args.list ) {
		for( const scene of DEMO_SCENES ) {
			console.log( `${ scene.id }\t${ scene.title }` );
		}
		return;
	}

	const scenes = resolveScenes( args.sceneIds );
	if( scenes.length === 0 ) {
		throw new Error( 'no demo scenes selected' );
	}

	if( args.skipBuild ) {
		process.env.CHATAIO_E2E_SKIP_BUILD = '1';
	}
	await ensureWebpackArtifacts();

	const userDataDir = demoProfileDir();
	const setupInPlaylist = scenes.some( ( scene ) => scene.id === 'setup' );
	const existingProfile = await profileHasReturningUser( userDataDir );
	const skipSetupToKeepLogin = setupInPlaylist
		&& existingProfile
		&& args.resetProfile === false
		&& args.sceneIds.length === 0;
	const runnable = scenes.filter( ( scene ) => {
		if( scene.id === 'setup' && skipSetupToKeepLogin ) {
			console.log( '[demo] 已有 demo/.profile，跳过 setup。重拍向导：--reset-profile 或 --scene setup' );
			return false;
		}
		return true;
	} );
	if( runnable.length === 0 ) {
		throw new Error( 'nothing to run after skipping setup' );
	}

	const mode = runnable[0].id === 'setup' ? 'first-launch' : 'returning-user';
	const resetProfile = args.resetProfile || mode === 'first-launch';
	console.log( `[demo] playlist: ${ runnable.map( ( scene ) => scene.id ).join( ' → ' ) }` );
	console.log( `[demo] profile: ${ userDataDir }` );

	const launched = await launchDemoApp( {
		mode ,
		userDataDir ,
		resetProfile,
	} );
	const ctx : DemoContext = {
		electronApp : launched.electronApp ,
		userDataDir ,
		pace : createDemoPace( args.pace ) ,
		chatAioRoot : launched.paths.chatAioRoot,
	};

	let failed : unknown;
	try {
		await primeDemoLightTheme( launched.electronApp );
		await presentDemoWindow( launched.electronApp );
		if( runnable[0].id !== 'setup' ) {
			await waitForDemoShowcaseReady( ctx );
		}
		if( runnable[0].id === 'setup' ) {
			await ensureDemoCursorVisible();
		} else {
			await showDemoCursorAt(
				getMainWindow( launched.electronApp ).getByTestId( TEST_IDS.currentAiBadge ),
			);
		}
		console.log( '[demo] OBS 可以开始录了（浅色英文，六页已预加载）。' );
		await beat( ctx.pace.prerollMs );
		for( let index = 0; index < runnable.length; index++ ) {
			const scene = runnable[index];
			console.log( `[demo] scene ${ index + 1 }/${ runnable.length } ${ scene.id } — ${ scene.title }` );
			await scene.run( ctx );
			await ensureDemoCursorVisible();
			if( index < runnable.length - 1 ) {
				console.log( '[demo] scene boundary（OBS 可下刀）' );
				await beat( ctx.pace.boundaryMs );
			}
		}
		console.log( '[demo] playlist done' );
		await ensureDemoCursorVisible();
		await beat( ctx.pace.boundaryMs );
	} catch ( error ) {
		failed = error;
		console.error( '[demo] failed:' , error );
	} finally {
		await closeDemoApp( launched , args.keepOpen && !failed );
	}
	if( failed ) {
		process.exitCode = 1;
	}
};

type DemoCli = {
	sceneIds : DemoSceneId[];
	list : boolean;
	resetProfile : boolean;
	keepOpen : boolean;
	skipBuild : boolean;
	pace : number;
};

const parseArgs = ( argv:string[] ):DemoCli => {
	const cli : DemoCli = {
		sceneIds : [] ,
		list : false ,
		resetProfile : false ,
		keepOpen : false ,
		skipBuild : process.env.CHATAIO_E2E_SKIP_BUILD === '1' ,
		pace : readPaceEnv(),
	};
	for( let i = 0; i < argv.length; i++ ) {
		const token = argv[i];
		if( token === '--list' ) {
			cli.list = true;
			continue;
		}
		if( token === '--reset-profile' ) {
			cli.resetProfile = true;
			continue;
		}
		if( token === '--keep-open' ) {
			cli.keepOpen = true;
			continue;
		}
		if( token === '--skip-build' ) {
			cli.skipBuild = true;
			continue;
		}
		if( token === '--scene' ) {
			const raw = argv[i + 1];
			if( !raw || raw.startsWith( '--' ) ) {
				throw new Error( '--scene needs an id or comma list' );
			}
			i += 1;
			cli.sceneIds.push( ...parseSceneIds( raw ) );
			continue;
		}
		if( token === '--pace' ) {
			const raw = argv[i + 1];
			if( !raw || raw.startsWith( '--' ) ) {
				throw new Error( '--pace needs a number' );
			}
			i += 1;
			cli.pace = Number( raw );
			continue;
		}
		if( token.startsWith( '--scene=' ) ) {
			cli.sceneIds.push( ...parseSceneIds( token.slice( '--scene='.length ) ) );
			continue;
		}
		if( token.startsWith( '--pace=' ) ) {
			cli.pace = Number( token.slice( '--pace='.length ) );
			continue;
		}
		throw new Error( `unknown arg: ${ token }` );
	}
	return cli;
};

const parseSceneIds = ( raw:string ) => {
	return raw.split( /[,\s]+/ ).map( ( part ) => part.trim() ).filter( Boolean ).map( ( id ) => {
		if( isDemoSceneId( id ) === false ) {
			throw new Error( `unknown scene "${ id }". --list` );
		}
		return id;
	} );
};

const resolveScenes = ( ids:DemoSceneId[] ) => {
	if( ids.length === 0 ) {
		return DEMO_DEFAULT_PLAYLIST.map( ( id ) => {
			const scene = DEMO_SCENES.find( ( item ) => item.id === id );
			if( !scene ) {
				throw new Error( `default playlist missing scene ${ id }` );
			}
			return scene;
		} );
	}
	return ids.map( ( id ) => {
		const scene = DEMO_SCENES.find( ( item ) => item.id === id );
		if( !scene ) {
			throw new Error( `unknown scene ${ id }` );
		}
		return scene;
	} );
};

const readPaceEnv = () => {
	const raw = process.env.CHATAIO_DEMO_PACE;
	if( !raw ) {
		return 1;
	}
	const parsed = Number( raw );
	return Number.isFinite( parsed ) && parsed > 0 ? parsed : 1;
};

const ensureWebpackArtifacts = async() => {
	const setup = ( await import( '../e2e/global-setup.ts' ) ).default;
	await setup();
};

void main().catch( ( error ) => {
	console.error( error );
	process.exit( 1 );
} );

import {
	DEMO_DEFAULT_PLAYLIST ,
	DEMO_SCENES ,
	isDemoSceneId ,
	type DemoSceneId,
} from './scenes';
import { createDemoPace , beat } from './support/pace';
import { showDemoCursorAt } from './support/mouse';
import { ensureDemoCursorVisible } from './support/cursor';
import { closeDemoApp , launchDemoApp , presentDemoWindow } from './support/launch';
import { demoProfileDir , profileHasReturningUser } from './support/profile';
import { primeDemoLightTheme } from './support/theme';
import {
	getMainWindow ,
	waitForDemoShowcaseReady ,
	type DemoContext,
} from './support/shell';
import { TEST_IDS } from '../e2e/support/selectors';
