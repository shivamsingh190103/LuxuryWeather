import { NextRequest, NextResponse } from "next/server";
import { getCitySuggestions } from "@/lib/server/weather-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  try {
    const suggestions = await getCitySuggestions(query);
    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error("City suggestions API failed", error);
    return NextResponse.json({ error: "Failed to fetch city suggestions" }, { status: 500 });
  }
}
