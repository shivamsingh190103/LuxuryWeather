import { NextRequest, NextResponse } from "next/server";
import { WeatherServiceError, getWeatherPayload } from "@/lib/server/weather-service";

export const dynamic = "force-dynamic";

function toNumber(input: string | null): number | undefined {
  if (!input) {
    return undefined;
  }

  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city")?.trim();
  const lat = toNumber(request.nextUrl.searchParams.get("lat"));
  const lon = toNumber(request.nextUrl.searchParams.get("lon"));

  try {
    await getWeatherPayload({ city, lat, lon });
    return new NextResponse(null, {
      status: 204,
      headers: {
        "x-cache-prefetch": "warmed"
      }
    });
  } catch (error) {
    if (error instanceof WeatherServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Weather prefetch failed", error);
    return NextResponse.json({ error: "Prefetch failed" }, { status: 500 });
  }
}
