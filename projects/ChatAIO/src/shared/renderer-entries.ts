export const AI_WEBAPP_RENDERER_ENTRY_POINTS = {
	SettingsView : 'src/Views/SettingsView/index.tsx' ,
	FloatingView : 'src/Views/FloatingView/index.tsx' ,
	GuidingView : 'src/Views/GuidingView/index.tsx' ,
	PromptView : 'src/Views/PromptView/index.tsx' ,
	MenuView : 'src/Views/MenuView/index.tsx',
} as const;

export type AIWebAppRendererEntryName = keyof typeof AI_WEBAPP_RENDERER_ENTRY_POINTS;

export const isAIWebAppRendererEntryName = (entry:string):entry is AIWebAppRendererEntryName => {
	return Object.prototype.hasOwnProperty.call( AI_WEBAPP_RENDERER_ENTRY_POINTS , entry );
};
