export const { i18n } = reaxel_I18n();
export const I18n = createI18nReactComponent( reaxel_I18n );

console.log(I18n);

import { reaxel_I18n } from "./i18n";
import { createI18nReactComponent } from '#generic/reaxels/Factories/i18n/views/react';
