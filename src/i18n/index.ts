import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import fr from './locales/fr.json';
import en from './locales/en.json';

enum Languages {
  FR = 'fr',
  EN = 'en',
}

const SUPPORTED_LOCALES = [Languages.FR, Languages.EN] as const;
const FALLBACK_LOCALE: Languages = Languages.EN;

function getDeviceLocale(): string {
  const locales = Localization.getLocales();
  const first = locales[0];
  if (!first?.languageCode) return FALLBACK_LOCALE;
  const code = first.languageCode.split('-')[0]?.toLowerCase() ?? first.languageCode.toLowerCase();
  return SUPPORTED_LOCALES.includes(code as (typeof SUPPORTED_LOCALES)[number]) ? code : FALLBACK_LOCALE;
}

const i18n = new I18n({ fr, en }, { defaultLocale: FALLBACK_LOCALE, locale: getDeviceLocale(), enableFallback: true });

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export function useTranslation() {
  return { t };
}

export { i18n, SUPPORTED_LOCALES, FALLBACK_LOCALE };
export type Locale = (typeof SUPPORTED_LOCALES)[number];
