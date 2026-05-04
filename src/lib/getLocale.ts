import { headers } from "next/headers";
import { defaultLocale, type Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  
  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/([^\/]+)/);
  if (localeMatch) {
    const locale = localeMatch[1] as Locale;
    if (["me", "en", "it", "sq"].includes(locale)) {
      return locale;
    }
  }
  
  return defaultLocale;
}
