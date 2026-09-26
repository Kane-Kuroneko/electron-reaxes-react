/**
 * 演示场景表。默认 playlist 是出镜一条 take：switch-ai → prompt → settings。
 * setup / Guiding 是备带，不进默认 take。
 * 设计：docs/features/playwright-demo-script.md
 */

export const DEMO_SCENE_IDS = [
	'setup' ,
	'switch-ai' ,
	'prompt' ,
	'settings',
] as const;

export type DemoSceneId = typeof DEMO_SCENE_IDS[number];

export type DemoScene = {
	id : DemoSceneId;
	title : string;
	run : ( ctx:DemoContext ) => Promise<void>;
};

export const DEMO_SCENES : DemoScene[] = [
	{
		id : 'setup' ,
		title : 'GuidingView first launch (backup)' ,
		run : runSetupScene,
	} ,
	{
		id : 'switch-ai' ,
		title : 'Badge list + menubar Prev/Next' ,
		run : runSwitchAiScene,
	} ,
	{
		id : 'prompt' ,
		title : 'Left Prompt write / switch / paste' ,
		run : runPromptScene,
	} ,
	{
		id : 'settings' ,
		title : 'Networks proxy + Manage AIs' ,
		run : runSettingsScene,
	},
];

export const DEMO_DEFAULT_PLAYLIST : DemoSceneId[] = [
	'switch-ai' ,
	'prompt' ,
	'settings',
];

export const isDemoSceneId = ( value:string ):value is DemoSceneId => {
	return ( DEMO_SCENE_IDS as readonly string[] ).includes( value );
};

import { runSetupScene } from './setup';
import { runSwitchAiScene } from './switch-ai';
import { runPromptScene } from './prompt';
import { runSettingsScene } from './settings';
import type { DemoContext } from '../support/shell';
