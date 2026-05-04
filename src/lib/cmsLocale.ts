import { defaultLocale, locales, type Locale } from "@/lib/i18n";

export function getStoredCmsLocale(): Locale {
  const cmsLocale = localStorage.getItem("cms-locale") as Locale | null;
  if (cmsLocale && locales.includes(cmsLocale)) {
    return cmsLocale;
  }

  const preferredLocale = localStorage.getItem("preferred-locale") as Locale | null;
  if (preferredLocale && locales.includes(preferredLocale)) {
    return preferredLocale;
  }

  return defaultLocale;
}

