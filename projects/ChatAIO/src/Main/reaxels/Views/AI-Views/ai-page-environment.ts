const aiPageEnvironmentByWebContents = new WeakMap<WebContents , AIPageEnvironment>();

export const registerAIPageEnvironmentForWebContents = (
	webContents:WebContents ,
	environment:AIPageEnvironment,
) => {
	aiPageEnvironmentByWebContents.set( webContents , environment );
};

export const getRegisteredAIPageEnvironment = (webContents:WebContents) => {
	return aiPageEnvironmentByWebContents.get( webContents ) || null;
};

export const deleteRegisteredAIPageEnvironment = (webContents:WebContents) => {
	aiPageEnvironmentByWebContents.delete( webContents );
};

import type { AIPageEnvironment } from '#src/Types/AIPageEnvironment';
import type { WebContents } from 'electron';
