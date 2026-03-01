"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Command, MapPin, RefreshCcw, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { GlassCard } from "@/components/GlassCard";
import { SearchBar, type SearchBarRef } from "@/components/SearchBar";
import { SkeletonCard } from "@/components/SkeletonCard";
import { TempTrendChart } from "@/components/TempTrendChart";
import { WeatherIconMotion } from "@/components/WeatherIconMotion";
import { WeatherMetrics } from "@/components/WeatherMetrics";
import { WeatherSceneFX } from "@/components/WeatherSceneFX";
import type { WeatherPayload } from "@/lib/types";
import {
  fetchWeather,
  readLastSuccessfulCache,
  readWeatherCache,
  type WeatherQuery,
  weatherCacheKey,
  WeatherClientError,
  writeLastSuccessfulCache,
  writeWeatherCache
} from "@/lib/weather-client";

const LazyWeatherMap = dynamic(
  () => import("@/components/WeatherMap").then((mod) => mod.WeatherMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 animate-pulse rounded-2xl border border-white/10 bg-white/10" />
    )
  }
);

const DEFAULT_CITY = "London";

export function WeatherClient() {
  const searchRef = useRef<SearchBarRef>(null);
  const requestCounter = useRef(0);

  const [query, setQuery] = useState("");
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<WeatherQuery>({ city: DEFAULT_CITY });
  const [debouncedQuery] = useDebounce(query, 500);

  const loadWeather = useCallback(async (weatherQuery: WeatherQuery, force = false) => {
    const currentRequest = requestCounter.current + 1;
    requestCounter.current = currentRequest;

    const cacheKey = weatherCacheKey(weatherQuery);
    setLastQuery(weatherQuery);
    setError(null);
    setNotice(null);

    if (!force) {
      const cached = readWeatherCache(cacheKey);
      if (cached) {
        setWeather(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = await fetchWeather(weatherQuery);

      if (currentRequest !== requestCounter.current) {
        return;
      }

      setWeather(payload);
      setError(null);
      setNotice(null);
      writeWeatherCache(cacheKey, payload);
      writeLastSuccessfulCache(payload);
    } catch (unknownError) {
      if (currentRequest !== requestCounter.current) {
        return;
      }

      const cached = readWeatherCache(cacheKey) ?? readLastSuccessfulCache();
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

      if (cached) {
        setWeather(cached);
        setNotice(
          isOffline
            ? "You are offline. Showing cached weather."
            : "Showing cached weather from the latest successful load."
        );
      }

      if (unknownError instanceof WeatherClientError) {
        if (!cached || unknownError.status === 404 || unknownError.status === 400) {
          setError(unknownError.message);
        }
      } else if (!cached) {
        setError("Unable to load weather data right now. Please retry.");
      }
    } finally {
      if (currentRequest === requestCounter.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    const fallback = () => {
      if (active) {
        loadWeather({ city: DEFAULT_CITY });
      }
    };

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      fallback();
      return () => {
        active = false;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) {
          return;
        }

        loadWeather({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      () => {
        fallback();
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000
      }
    );

    return () => {
      active = false;
    };
  }, [loadWeather]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    loadWeather({ city: trimmed });
  }, [debouncedQuery, loadWeather]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setFocusTrigger((count) => count + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const retry = () => {
    loadWeather(lastQuery, true);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full items-end px-0 pb-0 pt-8 md:items-center md:px-6 md:pb-8">
      <WeatherSceneFX
        condition={weather?.current.condition ?? "Clear"}
        icon={weather?.current.icon ?? "01d"}
      />
      <div className="relative z-10 w-full">
        <div className="mx-auto mb-4 flex w-full max-w-4xl items-center justify-between px-4 md:px-0">
          <p className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 md:flex">
            <Command className="h-3.5 w-3.5" />
            Cmd/Ctrl + K
          </p>
          <div className="ml-auto max-w-[calc(100vw-2rem)]">
            <SearchBar
              ref={searchRef}
              value={query}
              onChange={setQuery}
              onSubmit={(value) => {
                if (value.length >= 2) {
                  loadWeather({ city: value }, true);
                }
              }}
              focusTrigger={focusTrigger}
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="w-full"
        >
          <GlassCard className="md:px-8 md:pb-8 md:pt-7">
            {loading ? (
              <SkeletonCard />
            ) : error && !weather ? (
              <div className="space-y-4 text-center">
                <p className="text-lg font-semibold">Couldn&apos;t load weather</p>
                <p className="text-sm text-white/70">{error}</p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={retry}
                  className="hover-lift inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium"
                  type="button"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Retry
                </motion.button>
              </div>
            ) : weather ? (
              <div className="space-y-6">
                {(notice || error) && (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
                    <WifiOff className="h-3.5 w-3.5 text-sky-200" />
                    <span>{error ?? notice}</span>
                  </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-1 text-sm text-white/70">
                      <MapPin className="h-4 w-4 text-sky-200" />
                      {weather.location.name}, {weather.location.country}
                    </p>
                    <h1 className="mt-3 text-6xl font-bold leading-none tracking-tight sm:text-7xl">
                      {Math.round(weather.current.temp)}°
                    </h1>
                    <p className="mt-2 text-sm uppercase tracking-wider text-white/65">
                      {weather.current.condition}
                    </p>
                    <p className="mt-1 text-base capitalize text-white/85">
                      {weather.current.description}
                    </p>
                  </div>

                  <div className="self-end sm:self-auto">
                    <WeatherIconMotion condition={weather.current.condition} />
                  </div>
                </div>

                <WeatherMetrics
                  humidity={weather.current.humidity}
                  wind={weather.current.wind}
                  pressure={weather.current.pressure}
                  aqi={weather.aqi ?? weather.current.aqi}
                />

                <section className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
                  <h2 className="mb-2 text-xs uppercase tracking-widest text-white/60">
                    24-hour temperature trend
                  </h2>
                  <TempTrendChart data={weather.hourly} />
                </section>

                <section className="space-y-2">
                  <h2 className="text-xs uppercase tracking-widest text-white/60">Map</h2>
                  <LazyWeatherMap
                    lat={weather.location.lat}
                    lon={weather.location.lon}
                    city={weather.location.name}
                  />
                </section>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={retry}
                  className="hover-lift inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white"
                  type="button"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Refresh
                </motion.button>
              </div>
            ) : null}
          </GlassCard>
        </motion.div>
      </div>
    </main>
  );
}
