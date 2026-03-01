import { NextRequest, NextResponse } from "next/server";
import { WeatherServiceError, getWeatherPayloadWithMeta } from "@/lib/server/weather-service";
import { logServerError } from "@/lib/server/logger";
import { enforceRateLimit, getRequestIdentifier } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

function toNumber(input: string | null): number | undefined {
  if (!input) {
    return undefined;
  }

  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const rateLimit = await enforceRateLimit("weather", getRequestIdentifier(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: rateLimit.headers
      }
    );
  }

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
        "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
        "x-cache": cacheStatus,
        ...rateLimit.headers
      }
    });
  } catch (error) {
    if (error instanceof WeatherServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: rateLimit.headers }
      );
    }

    logServerError("Unexpected weather API error", error);
    return NextResponse.json(
      { error: "Failed to load weather" },
      { status: 500, headers: rateLimit.headers }
    );
  }
}
