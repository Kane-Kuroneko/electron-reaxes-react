/**
 * 录屏窗口只从 16:9 三档里取能放进主屏 workArea 的最大一档。
 * 不要用 workArea 最大怪尺寸（OBS 预设对不上）。
 * 设计：docs/features/playwright-demo-script.md
 */

export type DemoWindowSize = {
	width : number;
	height : number;
};

export const DEMO_WINDOW_PRESETS : readonly DemoWindowSize[] = [
	{
		width : 1920 ,
		height : 1080,
	} ,
	{
		width : 1600 ,
		height : 900,
	} ,
	{
		width : 1280 ,
		height : 720,
	},
];

export const pickDemoWindowSize = ( workArea:{
	width : number;
	height : number;
} ):DemoWindowSize => {
	const fit = DEMO_WINDOW_PRESETS.find( ( preset ) => {
		return preset.width <= workArea.width && preset.height <= workArea.height;
	} );
	return fit || DEMO_WINDOW_PRESETS[DEMO_WINDOW_PRESETS.length - 1];
};
