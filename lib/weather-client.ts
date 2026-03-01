import type { WeatherPayload } from "@/lib/types";

export type WeatherQuery = {
  city?: string;
  lat?: number;
  lon?: number;
};

type CacheEntry = {
  timestamp: number;
  data: WeatherPayload;
};

export const WEATHER_CACHE_TTL = 10 * 60 * 1000;
const LAST_SUCCESS_CACHE_KEY = "weather:last-success";

export class WeatherClientError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "WeatherClientError";
    this.status = status;
  }
}

export function buildWeatherApiUrl(query: WeatherQuery) {
  const params = new URLSearchParams();

  if (query.city) {
    params.set("city", query.city);
  }
  if (typeof query.lat === "number") {
    params.set("lat", query.lat.toString());
  }
  if (typeof query.lon === "number") {
    params.set("lon", query.lon.toString());
  }

  return `/api/weather?${params.toString()}`;
}

export function weatherCacheKey(query: WeatherQuery) {
  if (query.city) {
    return `weather:city:${query.city.toLowerCase().trim()}`;
  }

  const lat = Number(query.lat ?? 0).toFixed(2);
  const lon = Number(query.lon ?? 0).toFixed(2);
  return `weather:coords:${lat},${lon}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readWeatherCache(key: string): WeatherPayload | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.timestamp > WEATHER_CACHE_TTL) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function writeWeatherCache(key: string, data: WeatherPayload) {
  if (!canUseStorage()) {
    return;
  }

  const payload: CacheEntry = {
    timestamp: Date.now(),
    data
  };

  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore quota/storage errors in private mode.
  }
}

export function readLastSuccessfulCache() {
  return readWeatherCache(LAST_SUCCESS_CACHE_KEY);
}

export function writeLastSuccessfulCache(data: WeatherPayload) {
  writeWeatherCache(LAST_SUCCESS_CACHE_KEY, data);
}

export async function fetchWeather(query: WeatherQuery): Promise<WeatherPayload> {
  const response = await fetch(buildWeatherApiUrl(query), {
    cache: "no-store"
  });

  const body = (await response.json()) as WeatherPayload | { error?: string };

  if (!response.ok) {
    const message = "error" in body && body.error ? body.error : "Unable to fetch weather";
    throw new WeatherClientError(message, response.status);
  }

  return body as WeatherPayload;
}
