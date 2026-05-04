import { NextRequest, NextResponse } from "next/server";
import { autoTranslate, translateHTML } from "@/lib/translate";
import { type Locale } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";

/**
 * Test endpoint to check if translation is working
 */
export async function POST(request: NextRequest) {
  try {
    // Lock this down so it can't be abused in production
    await requireAdmin();

    const body = await request.json();
    const { text, sourceLocale = "en" } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    console.log(`[TEST TRANSLATION] Testing translation for text: "${text.substring(0, 50)}..." from ${sourceLocale}`);

    // Test simple translation
    const translations = await autoTranslate(text, sourceLocale as Locale);

    console.log(`[TEST TRANSLATION] Translations received:`, {
      me: translations.me?.substring(0, 50),
      en: translations.en?.substring(0, 50),
      it: translations.it?.substring(0, 50),
      sq: translations.sq?.substring(0, 50),
    });

    return NextResponse.json({
      success: true,
      original: text,
      sourceLocale,
      translations,
      translationStatus: {
        me: translations.me !== text ? "translated" : "same",
        en: translations.en !== text ? "translated" : "same",
        it: translations.it !== text ? "translated" : "same",
        sq: translations.sq !== text ? "translated" : "same",
      },
    });
  } catch (error: any) {
    console.error("[TEST TRANSLATION] Error:", error);
    return NextResponse.json(
      { error: error.message || "Translation test failed", stack: error.stack },
      { status: 500 }
    );
  }
}
