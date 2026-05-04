import { type Locale } from "./i18n";

/**
 * Get translated text from translations object, fallback to original
 */
export function getTranslatedText(
  text: string | undefined,
  translations: Record<string, string> | undefined,
  locale: Locale
): string {
  if (!text) return "";
  
  // If translations exist and have the requested locale, use it
  if (translations && translations[locale]) {
    return translations[locale];
  }
  
  // Fallback to original text
  return text;
}

/**
 * Get translated text from experience/education item
 */
export function getTranslatedField(
  item: any,
  field: string,
  translationsField: string,
  locale: Locale
): string {
  const original = item[field];
  if (!original) return "";
  
  const translations = item[translationsField];
  if (translations && translations[locale]) {
    return translations[locale];
  }
  
  return original;
}
