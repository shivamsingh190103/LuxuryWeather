import { NextRequest, NextResponse } from "next/server";
import { WeatherServiceError, getWeatherPayloadWithMeta } from "@/lib/server/weather-service";

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
    const { payload, cacheStatus } = await getWeatherPayloadWithMeta({
      city,
      lat,
      lon
    });

    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, max-age=300",
        "x-cache": cacheStatus
      }
    });
  } catch (error) {
    if (error instanceof WeatherServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unexpected weather API error", error);
    return NextResponse.json({ error: "Failed to load weather" }, { status: 500 });
  }
}
