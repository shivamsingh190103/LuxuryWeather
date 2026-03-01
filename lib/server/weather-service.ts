import type { WeatherPayload } from "@/lib/types";
import { getOptionalEnv } from "@/lib/server/env";
import { getRedisClient } from "@/lib/server/redis";

const OPENWEATHER_BASE = "https://api.openweathermap.org";
const WEATHER_CACHE_TTL_SECONDS = 600;
const WEATHER_CACHE_TTL_MS = WEATHER_CACHE_TTL_SECONDS * 1000;
const CITY_SUGGESTIONS_CACHE_TTL_SECONDS = 60 * 60;

export type WeatherServiceQuery = {
  city?: string;
  lat?: number;
  lon?: number;
};

type CacheEnvelope<T> = {
  fetchedAt: number;
  data: T;
};

type GeoEntry = {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
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

export type CitySuggestion = {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
  label: string;
};

export class WeatherServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WeatherServiceError";
    this.status = status;
  }
}

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

function requireOpenWeatherApiKey() {
  const apiKey = getOptionalEnv("OPENWEATHER_API_KEY");
  if (!apiKey) {
    throw new WeatherServiceError("Server not configured", 500);
  }
  return apiKey;
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

function normalizeQuery(query: WeatherServiceQuery): Required<WeatherServiceQuery> | WeatherServiceQuery {
  const city = query.city?.trim();
  const hasCoords = typeof query.lat === "number" && typeof query.lon === "number";

  if (!city && !hasCoords) {
    throw new WeatherServiceError("Provide either city or lat/lon", 400);
  }

  return {
    ...query,
    city
  };
}

function weatherCacheKey(query: WeatherServiceQuery) {
  if (query.city) {
    return `weather:city:${query.city.toLowerCase()}`;
  }

  const lat = Number(query.lat ?? 0).toFixed(3);
  const lon = Number(query.lon ?? 0).toFixed(3);
  return `weather:coords:${lat}:${lon}`;
}

async function fetchWeatherFromOpenWeather(query: WeatherServiceQuery): Promise<WeatherPayload> {
  const apiKey = requireOpenWeatherApiKey();

  const normalized = normalizeQuery(query);

  let resolvedLat = normalized.lat;
  let resolvedLon = normalized.lon;
  let resolvedCity = normalized.city ?? "";
  let resolvedCountry = "";

  if (normalized.city) {
    const geocodeUrl = `${OPENWEATHER_BASE}/geo/1.0/direct?q=${encodeURIComponent(normalized.city)}&limit=1&appid=${apiKey}`;
    const geocode = await fetchJson<GeoEntry[]>(geocodeUrl);

    if (!geocode.length) {
      throw new WeatherServiceError("City not found", 404);
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

  return {
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
}

export async function getWeatherPayload(query: WeatherServiceQuery): Promise<WeatherPayload> {
  const normalized = normalizeQuery(query);
  const key = weatherCacheKey(normalized);
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get<CacheEnvelope<WeatherPayload>>(key);
      if (cached && typeof cached.fetchedAt === "number") {
        if (Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL_MS && cached.data) {
          return cached.data;
        }
      }
    } catch (error) {
      console.error("Redis cache read failed for weather endpoint", error);
    }
  }

  const payload = await fetchWeatherFromOpenWeather(normalized);

  if (redis) {
    try {
      await redis.set(
        key,
        {
          fetchedAt: Date.now(),
          data: payload
        },
        { ex: WEATHER_CACHE_TTL_SECONDS }
      );
    } catch (error) {
      console.error("Redis cache write failed for weather endpoint", error);
    }
  }

  return payload;
}

function citySuggestionsCacheKey(query: string) {
  return `weather:cities:${query.toLowerCase()}`;
}

export async function getCitySuggestions(query: string): Promise<CitySuggestion[]> {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return [];
  }

  const redis = getRedisClient();
  const key = citySuggestionsCacheKey(trimmed);

  if (redis) {
    try {
      const cached = await redis.get<CacheEnvelope<CitySuggestion[]>>(key);
      if (cached && typeof cached.fetchedAt === "number" && Array.isArray(cached.data)) {
        const isFresh = Date.now() - cached.fetchedAt < CITY_SUGGESTIONS_CACHE_TTL_SECONDS * 1000;
        if (isFresh) {
          return cached.data;
        }
      }
    } catch (error) {
      console.error("Redis cache read failed for city suggestions", error);
    }
  }

  const apiKey = requireOpenWeatherApiKey();
  const geoUrl = `${OPENWEATHER_BASE}/geo/1.0/direct?q=${encodeURIComponent(trimmed)}&limit=8&appid=${apiKey}`;
  const geoEntries = await fetchJson<GeoEntry[]>(geoUrl);

  const seen = new Set<string>();
  const suggestions = geoEntries
    .map((entry) => {
      const labelParts = [entry.name, entry.state, entry.country].filter(Boolean);
      const label = labelParts.join(", ");
      return {
        name: entry.name,
        country: entry.country,
        state: entry.state,
        lat: Number(entry.lat.toFixed(4)),
        lon: Number(entry.lon.toFixed(4)),
        label
      } satisfies CitySuggestion;
    })
    .filter((entry) => {
      const dedupeKey = `${entry.lat}:${entry.lon}`;
      if (seen.has(dedupeKey)) {
        return false;
      }
      seen.add(dedupeKey);
      return true;
    });

  if (redis) {
    try {
      await redis.set(
        key,
        {
          fetchedAt: Date.now(),
          data: suggestions
        },
        { ex: CITY_SUGGESTIONS_CACHE_TTL_SECONDS }
      );
    } catch (error) {
      console.error("Redis cache write failed for city suggestions", error);
    }
  }

  return suggestions;
}
