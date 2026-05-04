import { type Locale } from "./i18n";
export type { Locale };
import me from "@/messages/me.json";
import en from "@/messages/en.json";
import it from "@/messages/it.json";
import sq from "@/messages/sq.json";

const translations = {
  me,
  en,
  it,
  sq,
};

export function getTranslations(locale: Locale = "en") {
  return translations[locale] || translations.en;
}

export type Translations = typeof me;
