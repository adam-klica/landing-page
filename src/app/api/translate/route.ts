import { NextRequest, NextResponse } from "next/server";
import { autoTranslate, translateHTML } from "@/lib/translate";
import { type Locale } from "@/lib/i18n";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, html, sourceLocale = "en" } = body;

    if (!text && !html) {
      return NextResponse.json(
        { error: "Text or HTML is required" },
        { status: 400 }
      );
    }

    let translations: Record<Locale, string>;

    if (html) {
      translations = await translateHTML(html, sourceLocale as Locale);
    } else {
      translations = await autoTranslate(text, sourceLocale as Locale);
    }

    return NextResponse.json({ translations });
  } catch (error: any) {
    console.error("Translation API error:", error);
    return NextResponse.json(
      { error: error.message || "Translation failed" },
      { status: 500 }
    );
  }
}
