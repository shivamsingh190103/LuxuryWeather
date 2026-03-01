import { NextRequest, NextResponse } from "next/server";
import { WeatherServiceError, getWeatherPayload } from "@/lib/server/weather-service";
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
  const rateLimit = await enforceRateLimit("prefetch", getRequestIdentifier(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many prefetch requests." },
      { status: 429, headers: rateLimit.headers }
    );
  }

  const city = request.nextUrl.searchParams.get("city")?.trim();
  const lat = toNumber(request.nextUrl.searchParams.get("lat"));
  const lon = toNumber(request.nextUrl.searchParams.get("lon"));

  try {
    await getWeatherPayload({ city, lat, lon });
    return new NextResponse(null, {
      status: 204,
      headers: {
        "x-cache-prefetch": "warmed",
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

    logServerError("Weather prefetch failed", error);
    return NextResponse.json(
      { error: "Prefetch failed" },
      { status: 500, headers: rateLimit.headers }
    );
  }
}
