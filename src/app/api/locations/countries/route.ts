import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "src", "data", "locations.json");
    const content = await readFile(filePath, "utf-8");
    const locations = JSON.parse(content);

    const countries = locations.map((l: any) => ({ code: l.code, name: l.name }));

    return NextResponse.json({ countries });
  } catch (error) {
    console.error("Error loading countries:", error);
    return NextResponse.json({ countries: [] }, { status: 500 });
  }
}

