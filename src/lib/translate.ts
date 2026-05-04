import { type Locale } from "./i18n";
import { srCyrToLat } from "./transliterate";

const TRANSLATION_DEBUG = process.env.TRANSLATION_DEBUG === "1";
const dbg = (...args: any[]) => {
  if (TRANSLATION_DEBUG) console.log(...args);
};

const TRANSLATE_CONCURRENCY = Math.max(
  1,
  Math.min(6, Number(process.env.TRANSLATE_CONCURRENCY || "3") || 3)
);

const TRANSLATE_RETRY_ATTEMPTS = Math.max(
  0,
  Math.min(5, Number(process.env.TRANSLATE_RETRY_ATTEMPTS || "2") || 2)
);
const TRANSLATE_RETRY_BASE_MS = Math.max(
  100,
  Math.min(5000, Number(process.env.TRANSLATE_RETRY_BASE_MS || "700") || 700)
);

function getTranslateMaxChunk(provider: string): number {
  // LibreTranslate public endpoints often enforce 500 chars.
  if (provider === "libretranslate") return 500;
  // Google GTX (unofficial) can handle more; keep conservative to reduce failures.
  return Math.max(500, Math.min(5000, Number(process.env.TRANSLATE_MAX_CHUNK || "4000") || 4000));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonWithRetry(
  url: string,
  init: RequestInit,
  opts: { timeoutMs: number; retryAttempts: number; retryBaseMs: number }
): Promise<Response> {
  const attempts = Math.max(0, opts.retryAttempts);
  for (let attempt = 0; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      // Retry on rate-limits and transient server errors.
      if ((res.status === 429 || (res.status >= 500 && res.status <= 599)) && attempt < attempts) {
        const wait = opts.retryBaseMs * (attempt + 1) + Math.floor(Math.random() * 250);
        await sleep(wait);
        continue;
      }

      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err?.name === "AbortError";
      if ((isAbort || err) && attempt < attempts) {
        const wait = opts.retryBaseMs * (attempt + 1) + Math.floor(Math.random() * 250);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }

  // Unreachable, but keeps TS happy.
  throw new Error("fetchJsonWithRetry: exhausted retries");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) return;
      results[idx] = await mapper(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

// Language codes mapping
const languageCodes: Record<Locale, string> = {
  me: "sr", // Montenegrin/Serbian
  en: "en",
  it: "it",
  sq: "sq", // Albanian
};

// LibreTranslate language codes (may differ from standard codes)
const libreTranslateCodes: Record<Locale, string> = {
  me: "sr", // Serbian
  en: "en",
  it: "it",
  sq: "sq", // Albanian
};

/**
 * Check if translated text contains an error message
 */
function containsErrorMessage(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const errorPatterns = [
    "QUERY LENGTH LIMIT",
    "MAX ALLOWED QUERY",
    "500 CHARS",
    "MYMEMORY WARNING",
    "Error:",
    "error:",
  ];
  return errorPatterns.some(pattern => text.includes(pattern));
}

/**
 * Automatically translate text to all supported languages
 * Uses a free translation API (LibreTranslate or similar)
 */
export async function autoTranslate(
  text: string,
  sourceLocale: Locale = "en",
  targetLocales?: Locale[]
): Promise<Record<Locale, string>> {
  dbg(`[AUTO TRANSLATE] Starting translation for text: "${text.substring(0, 50)}..." from locale: ${sourceLocale}`);
  
  const translations: Record<Locale, string> = {
    me: text,
    en: text,
    it: text,
    sq: text,
  };

  // If source is already in target language, keep original
  const sourceLang = languageCodes[sourceLocale];
  dbg(`[AUTO TRANSLATE] Source language code: ${sourceLang}`);

  try {
    // Try using LibreTranslate (free, self-hosted option)
    // Or use Google Translate API (requires API key)
    // For now, we'll use a simple approach with fetch to a translation service
    
    const all: Locale[] = ["me", "en", "it", "sq"];
    const requested = Array.isArray(targetLocales) && targetLocales.length > 0
      ? targetLocales
      : (all.filter((loc) => loc !== sourceLocale) as Locale[]);

    const targets = requested
      .filter((loc): loc is Locale => all.includes(loc))
      .filter((loc) => loc !== sourceLocale);
    
    dbg(`[AUTO TRANSLATE] Target locales to translate:`, targets);

    const results = await mapWithConcurrency(
      targets,
      TRANSLATE_CONCURRENCY,
      async (targetLocale) => {
        try {
          dbg(`[AUTO TRANSLATE] Translating to ${targetLocale} (${languageCodes[targetLocale]})...`);
          const translated = await translateText(text, sourceLang, languageCodes[targetLocale]);
          return { targetLocale, translated, ok: true as const };
        } catch (error: any) {
          return { targetLocale, translated: text, ok: false as const, error };
        }
      }
    );

    for (const r of results) {
      const targetLocale = r.targetLocale;
      const translated = r.translated;

      dbg(`[AUTO TRANSLATE] Translation result for ${targetLocale}:`, {
        originalLength: text.length,
        translatedLength: translated?.length || 0,
        isSame: translated === text,
        preview: translated?.substring(0, 50),
      });

      if (!r.ok) {
        console.error(
          `[AUTO TRANSLATE] ❌ Translation error for ${targetLocale}:`,
          (r as any)?.error?.message || (r as any)?.error
        );
        if (TRANSLATION_DEBUG) console.error(`[AUTO TRANSLATE] Error stack:`, (r as any)?.error?.stack);
        translations[targetLocale] = text;
        continue;
      }

      // Check if translation contains error message
      if (translated && translated !== text && !containsErrorMessage(translated)) {
        translations[targetLocale] = targetLocale === "me" ? srCyrToLat(translated) : translated;
        dbg(`[AUTO TRANSLATE] ✅ Successfully translated to ${targetLocale}: "${translated.substring(0, 50)}..."`);
      } else if (containsErrorMessage(translated)) {
        console.warn(`[AUTO TRANSLATE] ⚠️ Translation for ${targetLocale} contains error message, using original text`);
        translations[targetLocale] = text;
      } else {
        console.warn(`[AUTO TRANSLATE] ⚠️ Translation for ${targetLocale} returned same text or empty, keeping original`);
      }
    }
    
    dbg(`[AUTO TRANSLATE] Final translations:`, {
      me: translations.me?.substring(0, 30),
      en: translations.en?.substring(0, 30),
      it: translations.it?.substring(0, 30),
      sq: translations.sq?.substring(0, 30),
    });
  } catch (error: any) {
    console.error("[AUTO TRANSLATE] ❌ Auto-translation error:", error?.message || error);
    if (TRANSLATION_DEBUG) console.error("[AUTO TRANSLATE] Error stack:", error?.stack);
  }

  return translations;
}

/**
 * Split text into chunks of max length, trying to split at sentence boundaries
 */
function splitIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // Try to find a good split point (sentence boundary)
    const chunk = remaining.substring(0, maxLength);
    const lastPeriod = chunk.lastIndexOf(".");
    const lastExclamation = chunk.lastIndexOf("!");
    const lastQuestion = chunk.lastIndexOf("?");
    const lastNewline = chunk.lastIndexOf("\n");
    
    // Find the best split point
    const splitPoints = [lastPeriod, lastExclamation, lastQuestion, lastNewline].filter(p => p > maxLength * 0.5);
    const splitPoint = splitPoints.length > 0 ? Math.max(...splitPoints) + 1 : maxLength;

    chunks.push(remaining.substring(0, splitPoint).trim());
    remaining = remaining.substring(splitPoint).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

/**
 * Translate text from one language to another
 * Uses LibreTranslate public API (free, no API key needed)
 * Handles 500 character limit by splitting text into chunks and translating each chunk
 */
async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  // If source and target are the same, return original
  if (sourceLang === targetLang) {
    return text;
  }

  // Skip if text is empty
  if (!text || text.trim() === "") {
    return text;
  }

  const provider = (process.env.TRANSLATE_PROVIDER || "").toLowerCase();
  const MAX_LENGTH = getTranslateMaxChunk(provider);
  
  // If text is longer than limit, split into chunks
  if (text.length > MAX_LENGTH) {
    const chunks = splitIntoChunks(text, MAX_LENGTH);
    console.log(`[TRANSLATE] Text is ${text.length} chars, splitting into ${chunks.length} chunks`);
    
    const translatedChunks = await mapWithConcurrency(
      chunks,
      TRANSLATE_CONCURRENCY,
      async (chunk, i) => {
        console.log(`[TRANSLATE] Translating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        return await translateTextChunk(chunk, sourceLang, targetLang);
      }
    );
    
    // Join all translated chunks
    return translatedChunks.join(" ");
  }
  
  // If text is short enough, translate directly
  return translateTextChunk(text, sourceLang, targetLang);
}

/**
 * Translate a single chunk of text (max 500 chars)
 */
async function translateTextChunk(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const provider = (process.env.TRANSLATE_PROVIDER || "").toLowerCase();
  const MAX_LENGTH = getTranslateMaxChunk(provider);
  const textToTranslate = text.length > MAX_LENGTH ? text.substring(0, MAX_LENGTH) : text;
  const isTruncated = text.length > MAX_LENGTH;

  const translateWithGoogleGtx = async (
    q: string,
    sl: string,
    tl: string
  ): Promise<string | null> => {
    try {
      const url =
        "https://translate.googleapis.com/translate_a/single" +
        `?client=gtx&sl=${encodeURIComponent(sl)}` +
        `&tl=${encodeURIComponent(tl)}` +
        `&dt=t&q=${encodeURIComponent(q)}`;

      const res = await fetchJsonWithRetry(
        url,
        { method: "GET" },
        {
          timeoutMs: 10000,
          retryAttempts: TRANSLATE_RETRY_ATTEMPTS,
          retryBaseMs: TRANSLATE_RETRY_BASE_MS,
        }
      );

      if (!res.ok) {
        const t = await res.text();
        console.warn(`[TRANSLATE] Google GTX API error (${res.status}):`, t.substring(0, 200));
        return null;
      }

      const data: any = await res.json();
      // Expected shape: [[["Ciao mondo","Hello world",...], ...], ...]
      const parts: any[] | undefined = Array.isArray(data) ? data[0] : undefined;
      if (!Array.isArray(parts)) return null;

      const translated = parts
        .map((p) => (Array.isArray(p) ? p[0] : ""))
        .filter((s) => typeof s === "string" && s.length > 0)
        .join("");

      if (!translated || typeof translated !== "string") return null;
      return translated;
    } catch (err: any) {
      console.warn(`[TRANSLATE] Google GTX failed:`, err?.message || err);
      return null;
    }
  };

  try {
    console.log(`[TRANSLATE] Translating "${textToTranslate.substring(0, 30)}..." from ${sourceLang} to ${targetLang}${isTruncated ? ` (truncated from ${text.length} chars)` : ""}`);
    
    // Try multiple translation services for better reliability.
    // Default behavior: prefer Google GTX (more reliable than public LibreTranslate/MyMemory which rate-limit hard).
    const preferLibre = provider === "libretranslate";
    const allowGtxFallback =
      !preferLibre && (process.env.TRANSLATE_ALLOW_GTX_FALLBACK ?? "1") !== "0";

    // 1) Preferred provider
    if (!preferLibre) {
      // Google GTX
      const gtx = await translateWithGoogleGtx(textToTranslate, sourceLang, targetLang);
      if (gtx && gtx !== textToTranslate && gtx !== text) {
        console.log(`[TRANSLATE] Google GTX result: "${gtx.substring(0, 30)}..."`);
        return isTruncated ? gtx + text.substring(MAX_LENGTH) : gtx;
      }
    }

    // 2) LibreTranslate (public endpoint may rate-limit; keep as fallback unless explicitly preferred)
    try {
      const libreUrl = process.env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate";
      const libreApiKey = process.env.LIBRETRANSLATE_API_KEY;
      
      const response = await fetchJsonWithRetry(libreUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: textToTranslate,
          source: sourceLang,
          target: targetLang,
          format: "text",
          ...(libreApiKey ? { api_key: libreApiKey } : {}),
        }),
      }, {
        timeoutMs: 10000,
        retryAttempts: TRANSLATE_RETRY_ATTEMPTS,
        retryBaseMs: TRANSLATE_RETRY_BASE_MS,
      });

      if (response.ok) {
        const data = await response.json();
        const translated = data.translatedText || textToTranslate;
        console.log(`[TRANSLATE] LibreTranslate response for ${sourceLang}->${targetLang}:`, {
          status: response.status,
          hasTranslatedText: !!data.translatedText,
          translatedLength: translated?.length || 0,
          originalLength: textToTranslate.length,
        });
        // Check if response contains error message
        if (translated && typeof translated === "string" && 
            (translated.includes("QUERY LENGTH LIMIT") || 
             translated.includes("MAX ALLOWED QUERY") ||
             translated.includes("500 CHARS"))) {
          console.warn(`[TRANSLATE] Response contains error message, using original text`);
          return text; // Return original if error in response
        }
        if (translated && translated !== textToTranslate && translated !== text && translated.trim() !== "") {
          console.log(`[TRANSLATE] LibreTranslate success: "${translated.substring(0, 50)}..."`);
          // If text was truncated, append original remaining text
          return isTruncated ? translated + text.substring(MAX_LENGTH) : translated;
        } else {
          console.warn(`[TRANSLATE] LibreTranslate returned same text or empty, translated="${translated?.substring(0, 30)}", original="${textToTranslate.substring(0, 30)}"`);
        }
      } else {
        const errorText = await response.text();
        console.error(`[TRANSLATE] LibreTranslate API error (${response.status}):`, errorText.substring(0, 200));
        if (errorText.includes("QUERY LENGTH LIMIT") || 
            errorText.includes("500") ||
            errorText.includes("MAX ALLOWED QUERY")) {
          console.warn(`[TRANSLATE] Query length limit exceeded, skipping translation`);
          return text; // Return original if limit exceeded
        }
      }
    } catch (libreError: any) {
      if (libreError.message?.includes("QUERY LENGTH LIMIT") || libreError.message?.includes("500")) {
        console.warn(`[TRANSLATE] Query length limit exceeded, skipping translation`);
        return text; // Return original if limit exceeded
      }
      console.warn(`[TRANSLATE] LibreTranslate failed, trying alternative:`, libreError.message);
    }

    // 3) Google GTX fallback if LibreTranslate failed or returned same text
    if (allowGtxFallback) {
      const gtx2 = await translateWithGoogleGtx(textToTranslate, sourceLang, targetLang);
      if (gtx2 && gtx2 !== textToTranslate && gtx2 !== text) {
        console.log(`[TRANSLATE] Google GTX result: "${gtx2.substring(0, 30)}..."`);
        return isTruncated ? gtx2 + text.substring(MAX_LENGTH) : gtx2;
      }
    }

    // 4) Last fallback: MyMemory Translation API (very limited free tier)
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${sourceLang}|${targetLang}`;
      const response = await fetchJsonWithRetry(myMemoryUrl, { method: "GET" }, {
        timeoutMs: 10000,
        retryAttempts: TRANSLATE_RETRY_ATTEMPTS,
        retryBaseMs: TRANSLATE_RETRY_BASE_MS,
      });

      if (response.ok) {
        const data = await response.json();
        const translated = data.responseData?.translatedText || textToTranslate;
        // Check if response contains error message
        if (translated && typeof translated === "string" && 
            (translated.includes("QUERY LENGTH LIMIT") || 
             translated.includes("MAX ALLOWED QUERY") ||
             translated.includes("500 CHARS") ||
             translated === "MYMEMORY WARNING")) {
          console.warn(`[TRANSLATE] Response contains error message, using original text`);
          return text; // Return original if error in response
        }
        if (translated && translated !== textToTranslate && translated !== text) {
          console.log(`[TRANSLATE] MyMemory result: "${translated.substring(0, 30)}..."`);
          // If text was truncated, append original remaining text
          return isTruncated ? translated + text.substring(MAX_LENGTH) : translated;
        }
      }
    } catch (myMemoryError: any) {
      console.warn(`[TRANSLATE] MyMemory failed:`, myMemoryError.message);
    }

    // If all services fail, return original text
    console.warn(`[TRANSLATE] All translation services failed, returning original text`);
    return text;
  } catch (error) {
    console.error(`[TRANSLATE] Error translating from ${sourceLang} to ${targetLang}:`, error);
    // Fallback: return original text
    return text;
  }
}

/**
 * Translate HTML content (preserves HTML tags)
 * Only translates text content, preserving HTML structure
 */
export async function translateHTML(
  html: string,
  sourceLocale: Locale = "en",
  targetLocales?: Locale[]
): Promise<Record<Locale, string>> {
  // If HTML is empty or just whitespace, return as-is for all locales
  if (!html || html.trim() === "") {
    return {
      me: html,
      en: html,
      it: html,
      sq: html,
    };
  }

  // Robust approach: translate each text chunk between tags, preserving tags exactly.
  // This avoids word-count mismatches that cause partial translations.
  const parts = html.split(/(<[^>]*>)/);
  const textParts = parts
    .filter((p) => !(p.startsWith("<") && p.endsWith(">")))
    .map((p) => p);

  const meaningful = textParts
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (meaningful.length === 0) {
    return { me: html, en: html, it: html, sq: html };
  }

  // Private-use separator chars: very unlikely to be modified by translation providers
  const SEP = "\uE000\uE001\uE002\uE003\uE004";
  const joined = meaningful.join(SEP);
  dbg(`[TRANSLATE HTML] Translating ${meaningful.length} text chunks (joined length: ${joined.length})`);

  const joinedTranslations = await autoTranslate(joined, sourceLocale, targetLocales);

  const splitBySep = (s: string) => s.split(SEP);

  const result: Record<Locale, string> = { me: html, en: html, it: html, sq: html };

  const all: Locale[] = ["me", "en", "it", "sq"];
  const requested = Array.isArray(targetLocales) && targetLocales.length > 0
    ? targetLocales
    : (all.filter((loc) => loc !== sourceLocale) as Locale[]);
  const targets = requested
    .filter((loc): loc is Locale => all.includes(loc))
    .filter((loc) => loc !== sourceLocale);

  for (const locale of all) {
    if (locale === sourceLocale) {
      result[locale] = html;
      continue;
    }
    if (!targets.includes(locale)) {
      // Not requested → leave original HTML
      result[locale] = html;
      continue;
    }

    const translatedJoined = joinedTranslations[locale] || joined;
    let translatedChunks = splitBySep(translatedJoined);

    // If delimiter got mangled, fall back to per-chunk translation (slower but correct)
    if (translatedChunks.length !== meaningful.length) {
      console.warn(`[TRANSLATE HTML] Chunk split mismatch for ${locale} (${translatedChunks.length} vs ${meaningful.length}), falling back to per-chunk translation`);
      translatedChunks = await mapWithConcurrency(
        meaningful,
        TRANSLATE_CONCURRENCY,
        async (chunk) => {
          const t = (await autoTranslate(chunk, sourceLocale, [locale]))[locale] || chunk;
          return locale === "me" ? srCyrToLat(t) : t;
        }
      );
    }

    let idx = 0;
    const rebuilt = parts
      .map((p) => {
        if (p.startsWith("<") && p.endsWith(">")) return p;
        const trimmed = p.trim();
        if (!trimmed) return p; // whitespace only
        const leading = p.match(/^\s*/)?.[0] || "";
        const trailing = p.match(/\s*$/)?.[0] || "";
        const replacement = translatedChunks[idx++] ?? trimmed;
        const finalText = locale === "me" ? srCyrToLat(replacement) : replacement;
        return leading + finalText + trailing;
      })
      .join("");

    result[locale] = rebuilt;
  }

  return result;
}
