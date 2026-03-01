import { NextRequest, NextResponse } from "next/server";
import { getCitySuggestions } from "@/lib/server/weather-service";
import { enforceRateLimit, getRequestIdentifier } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimit = await enforceRateLimit("cities", getRequestIdentifier(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: rateLimit.headers }
    );
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json(
      { suggestions: [] },
      {
        status: 200,
        headers: {
          ...rateLimit.headers
        }
      }
    );
  }

  try {
    const suggestions = await getCitySuggestions(query);
    return NextResponse.json(
      { suggestions },
      {
        status: 200,
        headers: {
          "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
          ...rateLimit.headers
        }
      }
    );
  } catch (error) {
    console.error("City suggestions API failed", error);
    return NextResponse.json(
      { error: "Failed to fetch city suggestions" },
      { status: 500, headers: rateLimit.headers }
    );
  }
}
