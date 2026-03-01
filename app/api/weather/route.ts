import { NextRequest, NextResponse } from "next/server";
import type { WeatherPayload } from "@/lib/types";

type GeoEntry = {
  name: string;
  lat: number;
  lon: number;
  country: string;
};

type WeatherNow = {
  coord: { lat: number; lon: number };
  name: string;
  sys: { country: string };
  main: {
    temp: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
};

type OneCall = {
  hourly: Array<{
    dt: number;
    temp: number;
    weather: Array<{
      main: string;
      icon: string;
    }>;
  }>;
};

type Forecast3H = {
  list: Array<{
    dt: number;
    main: { temp: number };
    weather: Array<{
      main: string;
      icon: string;
    }>;
  }>;
};

type AirPollution = {
  list: Array<{
    main: {
      aqi: number;
    };
  }>;
};

const OPENWEATHER_BASE = "https://api.openweathermap.org";
export const dynamic = "force-dynamic";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    const error = new Error(`OpenWeather error: ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

function toNumber(input: string | null): number | null {
  if (!input) {
    return null;
  }
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildHourlyFromForecast(forecast: Forecast3H) {
  const points = forecast.list.slice(0, 8);

  return points.map((entry) => ({
    ts: entry.dt,
    temp: Number(entry.main.temp.toFixed(1)),
    condition: entry.weather[0]?.main ?? "Unknown",
    icon: entry.weather[0]?.icon ?? "01d"
  }));
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const city = request.nextUrl.searchParams.get("city")?.trim();
  const lat = toNumber(request.nextUrl.searchParams.get("lat"));
  const lon = toNumber(request.nextUrl.searchParams.get("lon"));

  if (!city && (lat === null || lon === null)) {
    return NextResponse.json(
      { error: "Provide either city or lat/lon" },
      { status: 400 }
    );
  }

  try {
    let resolvedLat = lat;
    let resolvedLon = lon;
    let resolvedCity = city ?? "";
    let resolvedCountry = "";

    if (city) {
      const geocodeUrl = `${OPENWEATHER_BASE}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
      const geocode = await fetchJson<GeoEntry[]>(geocodeUrl);

      if (!geocode.length) {
        return NextResponse.json({ error: "City not found" }, { status: 404 });
      }

      resolvedLat = geocode[0].lat;
      resolvedLon = geocode[0].lon;
      resolvedCity = geocode[0].name;
      resolvedCountry = geocode[0].country;
    }

    const currentUrl = `${OPENWEATHER_BASE}/data/2.5/weather?lat=${resolvedLat}&lon=${resolvedLon}&appid=${apiKey}&units=metric`;
    const current = await fetchJson<WeatherNow>(currentUrl);

    resolvedLat = current.coord.lat;
    resolvedLon = current.coord.lon;
    resolvedCity = current.name;
    resolvedCountry = current.sys.country;

    let hourly: WeatherPayload["hourly"] = [];

    try {
      const oneCallUrl = `${OPENWEATHER_BASE}/data/3.0/onecall?lat=${resolvedLat}&lon=${resolvedLon}&appid=${apiKey}&units=metric&exclude=minutely,daily,alerts`;
      const oneCall = await fetchJson<OneCall>(oneCallUrl);
      hourly = oneCall.hourly.slice(0, 24).map((entry) => ({
        ts: entry.dt,
        temp: Number(entry.temp.toFixed(1)),
        condition: entry.weather[0]?.main ?? "Unknown",
        icon: entry.weather[0]?.icon ?? "01d"
      }));
    } catch {
      const forecastUrl = `${OPENWEATHER_BASE}/data/2.5/forecast?lat=${resolvedLat}&lon=${resolvedLon}&appid=${apiKey}&units=metric`;
      const forecast = await fetchJson<Forecast3H>(forecastUrl);
      hourly = buildHourlyFromForecast(forecast);
    }

    let aqi: number | undefined;

    try {
      const airUrl = `${OPENWEATHER_BASE}/data/2.5/air_pollution?lat=${resolvedLat}&lon=${resolvedLon}&appid=${apiKey}`;
      const air = await fetchJson<AirPollution>(airUrl);
      aqi = air.list[0]?.main.aqi;
    } catch {
      aqi = undefined;
    }

    const payload: WeatherPayload = {
      location: {
        name: resolvedCity,
        country: resolvedCountry,
        lat: Number((resolvedLat ?? 0).toFixed(4)),
        lon: Number((resolvedLon ?? 0).toFixed(4))
      },
      current: {
        temp: Number(current.main.temp.toFixed(1)),
        condition: current.weather[0]?.main ?? "Unknown",
        description: current.weather[0]?.description ?? "No description",
        icon: current.weather[0]?.icon ?? "01d",
        humidity: current.main.humidity,
        wind: Number(current.wind.speed.toFixed(1)),
        pressure: current.main.pressure,
        ...(typeof aqi === "number" ? { aqi } : {})
      },
      ...(typeof aqi === "number" ? { aqi } : {}),
      hourly
    };

    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, max-age=300"
      }
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status;

    if (status === 404) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Failed to load weather" }, { status: 500 });
  }
}
