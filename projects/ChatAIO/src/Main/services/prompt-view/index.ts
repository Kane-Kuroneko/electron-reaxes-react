const promptViewStore = new ElectronStore<PromptViewStoreSchema>( {
	name : 'prompt-view',
} );

export const getPromptViewState = (side:PromptView.Side):PromptView.State => {
	const safeSide = normalizePromptViewSide( side );
	return {
		side : safeSide ,
		items : getPromptViewItems( safeSide ) ,
		...getPromptViewAppearanceState(),
	};
};

export const getPromptViewAppearanceState = (
	appearance = getPromptViewAppearance(),
):PromptView.AppearanceState => {
	return {
		appearance : normalizePromptViewAppearance( appearance ) ,
		environment : getPromptViewEnvironment(),
	};
};

export const savePromptViewItems = (
	side:PromptView.Side ,
	items:PromptView.Item[],
):PromptView.SaveResult => {
	try {
		const safeSide = normalizePromptViewSide( side );
		const normalizedItems = Array.isArray( items )
			? items.map( normalizePromptItem )
			: [];
		promptViewStore.set( safeSide , normalizedItems );
		return {
			success : true ,
			items : normalizedItems,
		};
	} catch ( error ) {
		return {
			success : false ,
			items : [] ,
			error : error instanceof Error ? error.message : String( error ),
		};
	}
};

const getPromptViewItems = (side:PromptView.Side) => {
	const storedItems = promptViewStore.get( side );
	if( Array.isArray( storedItems ) ) {
		return storedItems.map( normalizePromptItem );
	}
	return createDefaultPromptItems();
};

const getPromptViewAppearance = ():PromptView.Appearance => {
	const settings = getSettingsConfigService().getEffectiveSettings();
	return {
		theme : settings.appearance.theme ,
		language : settings.appearance.language,
	};
};

const normalizePromptViewAppearance = (
	appearance:PromptView.Appearance,
):PromptView.Appearance => {
	const settingsAppearance = getSettingsConfigService().getEffectiveSettings().appearance;
	return {
		theme : normalizeThemePreference( appearance?.theme || settingsAppearance.theme , settingsAppearance.darkmode ) ,
		language : normalizeLanguagePreference( appearance?.language || settingsAppearance.language ),
	};
};

const getPromptViewEnvironment = ():PromptView.Environment => {
	const environment = getAppearanceEnvironment();
	return {
		systemLanguage : environment.systemLanguage ,
		systemTheme : environment.systemTheme,
	};
};

const createDefaultPromptItems = () => {
	return [
		createPromptItem() ,
		createPromptItem() ,
		createPromptItem(),
	];
};

const createPromptItem = (content = ''):PromptView.Item => {
	const now = Date.now();
	return {
		id : createPromptItemId() ,
		content ,
		createdAt : now ,
		updatedAt : now,
	};
};

const normalizePromptItem = (item:Partial<PromptView.Item>):PromptView.Item => {
	const now = Date.now();
	const createdAt = typeof item.createdAt === 'number' && Number.isFinite( item.createdAt )
		? item.createdAt
		: now;
	const updatedAt = typeof item.updatedAt === 'number' && Number.isFinite( item.updatedAt )
		? item.updatedAt
		: now;
	return {
		id : typeof item.id === 'string' && item.id.trim()
			? item.id
			: createPromptItemId() ,
		content : typeof item.content === 'string'
			? item.content
			: '' ,
		createdAt ,
		updatedAt,
	};
};

const normalizePromptViewSide = (side:PromptView.Side):PromptView.Side => {
	return side === 'right' ? 'right' : 'left';
};

const createPromptItemId = () => {
	return `prompt-${ randomUUID() }`;
};

type PromptViewStoreSchema = {
	left?: PromptView.Item[];
	right?: PromptView.Item[];
};

import { getAppearanceEnvironment } from '#main/services/appearance';
import { getSettingsConfigService } from '#main/services/settings/settings-config-service';
import {
	normalizeLanguagePreference ,
	normalizeThemePreference,
} from '#src/shared/appearance';
import type { PromptView } from '#src/Types/PromptView';
import ElectronStore from 'electron-store';
import { randomUUID } from 'node:crypto';
