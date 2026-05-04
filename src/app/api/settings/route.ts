import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET - Fetch settings
export async function GET() {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // settings documents use a string _id ("main"), so we keep this collection untyped
    const collection = (await getCollection("settings")) as any;
    const settings = await collection.findOne({ _id: "main" });

    return NextResponse.json({
      settings: settings || {
        siteTitle: "Adriatic Blue Growth Cluster",
        siteDescription: "Adriatic Blue Growth Cluster (ABGC)",
        adminEmail: "admin@abgc.local",
        translationEnabled: true,
        defaultTranslationLocale: "me",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // settings documents use a string _id ("main"), so we keep this collection untyped
    const collection = (await getCollection("settings")) as any;

    const settingsData = {
      _id: "main",
      siteTitle: body.siteTitle || "Adriatic Blue Growth Cluster",
      siteDescription: body.siteDescription || "Adriatic Blue Growth Cluster (ABGC)",
      adminEmail: body.adminEmail || "admin@abgc.local",
      translationEnabled: body.translationEnabled !== undefined ? body.translationEnabled : true,
      defaultTranslationLocale: body.defaultTranslationLocale || "me",
      updatedAt: new Date(),
    };

    await collection.updateOne(
      { _id: "main" },
      { $set: settingsData },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      settings: settingsData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
