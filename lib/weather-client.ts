import { del, get, keys, set } from "idb-keyval";
import type { WeatherPayload } from "@/lib/types";

export type WeatherQuery = {
  city?: string;
  lat?: number;
  lon?: number;
};

export type WeatherCacheEntry = {
  timestamp: number;
  data: WeatherPayload;
};

type ReadCacheOptions = {
  allowStale?: boolean;
};

export const WEATHER_CACHE_TTL = 10 * 60 * 1000;
const LAST_SUCCESS_CACHE_KEY = "weather:last-success";
const WEATHER_KEY_PREFIX = "weather:";

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

function canUseIndexedDb() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function isEntryStale(entry: WeatherCacheEntry) {
  return Date.now() - entry.timestamp > WEATHER_CACHE_TTL;
}

async function readEntry(
  key: string,
  options: ReadCacheOptions = {}
): Promise<WeatherCacheEntry | null> {
  if (!canUseIndexedDb()) {
    return null;
  }

  try {
    const entry = await get<WeatherCacheEntry>(key);

    if (!entry || typeof entry.timestamp !== "number" || !entry.data) {
      return null;
    }

    if (!options.allowStale && isEntryStale(entry)) {
      await del(key);
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

export async function readWeatherCacheEntry(
  key: string,
  options: ReadCacheOptions = {}
) {
  return readEntry(key, options);
}

export async function readWeatherCache(key: string, options: ReadCacheOptions = {}) {
  const entry = await readEntry(key, options);
  return entry?.data ?? null;
}

export async function writeWeatherCache(key: string, data: WeatherPayload) {
  if (!canUseIndexedDb()) {
    return;
  }

  const payload: WeatherCacheEntry = {
    timestamp: Date.now(),
    data
  };

  try {
    await set(key, payload);
  } catch {
    // Ignore quota and private mode failures.
  }
}

export async function readLastSuccessfulCacheEntry(options: ReadCacheOptions = {}) {
  return readEntry(LAST_SUCCESS_CACHE_KEY, options);
}

export async function readLastSuccessfulCache(options: ReadCacheOptions = {}) {
  const entry = await readEntry(LAST_SUCCESS_CACHE_KEY, options);
  return entry?.data ?? null;
}

export async function writeLastSuccessfulCache(data: WeatherPayload) {
  await writeWeatherCache(LAST_SUCCESS_CACHE_KEY, data);
}

export async function readNewestWeatherCacheEntry(options: ReadCacheOptions = {}) {
  if (!canUseIndexedDb()) {
    return null;
  }

  try {
    const allKeys = await keys();
    let newest: WeatherCacheEntry | null = null;

    for (const cacheKey of allKeys) {
      if (typeof cacheKey !== "string") {
        continue;
      }

      if (!cacheKey.startsWith(WEATHER_KEY_PREFIX)) {
        continue;
      }

      const entry = await readEntry(cacheKey, { allowStale: true });
      if (!entry) {
        continue;
      }

      if (!newest || entry.timestamp > newest.timestamp) {
        newest = entry;
      }
    }

    if (!newest) {
      return null;
    }

    if (!options.allowStale && isEntryStale(newest)) {
      return null;
    }

    return newest;
  } catch {
    return null;
  }
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
