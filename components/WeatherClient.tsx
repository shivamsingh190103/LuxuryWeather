"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Command, MapPin, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { AnimatedTemperature } from "@/components/AnimatedTemperature";
import { DynamicBackground } from "@/components/DynamicBackground";
import { GlassCard } from "@/components/GlassCard";
import { SearchBar, type SearchBarRef } from "@/components/SearchBar";
import { SkeletonCard } from "@/components/SkeletonCard";
import { WeatherMetrics } from "@/components/WeatherMetrics";
import { WeatherSceneFX } from "@/components/WeatherSceneFX";
import { useCanHover } from "@/hooks/useCanHover";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { WeatherPayload } from "@/lib/types";
import {
  fetchWeather,
  readLastSuccessfulCacheEntry,
  readWeatherCacheEntry,
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

const LazyTempTrendChart = dynamic(
  () => import("@/components/TempTrendChart").then((mod) => mod.TempTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/10" />
    )
  }
);

const LazyWeatherIconMotion = dynamic(
  () => import("@/components/WeatherIconMotion").then((mod) => mod.WeatherIconMotion),
  {
    ssr: false,
    loading: () => (
      <div className="h-24 w-24 animate-pulse rounded-full border border-white/10 bg-white/10" />
    )
  }
);

const DEFAULT_CITY = "London";

type CitySuggestion = {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
  label: string;
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.08,
      delayChildren: 0.06
    }
  }
};

const childVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

function formatUpdatedText(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (minutes < 60) {
    return `Updated ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Updated ${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

function parseRetryAfterSeconds(headers: Headers) {
  const retryAfter = headers.get("retry-after");
  if (!retryAfter) {
    return 1;
  }

  const parsed = Number(retryAfter);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.ceil(parsed);
  }

  const parsedDate = Date.parse(retryAfter);
  if (Number.isFinite(parsedDate)) {
    return Math.max(1, Math.ceil((parsedDate - Date.now()) / 1000));
  }

  return 1;
}

export function WeatherClient() {
  const searchRef = useRef<SearchBarRef>(null);
  const requestCounter = useRef(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const suggestionsCacheRef = useRef(new Map<string, CitySuggestion[]>());
  const prefetchedSuggestionsRef = useRef(new Set<string>());
  const prefetchCooldownUntilRef = useRef(0);
  const hoverPrefetchTimerRef = useRef<number | null>(null);
  const suppressNextDebounceRef = useRef(false);
  const suppressNextSuggestionsFetchRef = useRef(false);

  const canHover = useCanHover();
  const isOnline = useOnlineStatus();

  const [query, setQuery] = useState("");
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [lastQuery, setLastQuery] = useState<WeatherQuery>({ city: DEFAULT_CITY });
  const [weatherRetryUntil, setWeatherRetryUntil] = useState<number | null>(null);
  const [weatherRetryRemaining, setWeatherRetryRemaining] = useState<number | null>(null);

  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [debouncedQuery] = useDebounce(query, 500);
  const weatherCooldownActive = weatherRetryRemaining !== null;

  useEffect(() => {
    if (!weatherRetryUntil) {
      setWeatherRetryRemaining(null);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.ceil((weatherRetryUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setWeatherRetryUntil(null);
        setWeatherRetryRemaining(null);
        return;
      }

      setWeatherRetryRemaining(remaining);
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [weatherRetryUntil]);

  const clearHoverPrefetchTimer = useCallback(() => {
    if (hoverPrefetchTimerRef.current !== null) {
      window.clearTimeout(hoverPrefetchTimerRef.current);
      hoverPrefetchTimerRef.current = null;
    }
  }, []);

  const loadWeather = useCallback(async (weatherQuery: WeatherQuery, force = false) => {
    const currentRequest = requestCounter.current + 1;
    requestCounter.current = currentRequest;

    const cacheKey = weatherCacheKey(weatherQuery);
    setLastQuery(weatherQuery);
    setError(null);
    setNotice(null);

    if (!force) {
      const cachedEntry = await readWeatherCacheEntry(cacheKey);
      if (cachedEntry && currentRequest === requestCounter.current) {
        setWeather(cachedEntry.data);
        setLastUpdatedAt(cachedEntry.timestamp);
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

      const now = Date.now();
      setLastUpdatedAt(now);

      await writeWeatherCache(cacheKey, payload);
      await writeLastSuccessfulCache(payload);
    } catch (unknownError) {
      if (currentRequest !== requestCounter.current) {
        return;
      }

      const cachedEntry =
        (await readWeatherCacheEntry(cacheKey, { allowStale: true })) ??
        (await readLastSuccessfulCacheEntry({ allowStale: true }));

      const offline = typeof navigator !== "undefined" && !navigator.onLine;

      if (cachedEntry) {
        setWeather(cachedEntry.data);
        setLastUpdatedAt(cachedEntry.timestamp);
        if (!offline) {
          setNotice("Showing cached weather from the latest successful load.");
        }
      }

      if (unknownError instanceof WeatherClientError) {
        if (unknownError.status === 429) {
          const retryAfterSeconds = Math.max(1, unknownError.retryAfterSeconds ?? 30);
          setWeatherRetryUntil(Date.now() + retryAfterSeconds * 1000);

          if (!cachedEntry) {
            setError(`Too many requests. Please retry in ${retryAfterSeconds}s.`);
          }
          return;
        }

        if (!cachedEntry || unknownError.status === 404 || unknownError.status === 400) {
          setError(unknownError.message);
        }
      } else if (!cachedEntry) {
        setError("Unable to load weather data right now. Please retry.");
      }
    } finally {
      if (currentRequest === requestCounter.current) {
        setLoading(false);
      }
    }
  }, []);

  const prefetchSuggestion = useCallback(async (suggestion: CitySuggestion) => {
    if (Date.now() < prefetchCooldownUntilRef.current) {
      return;
    }

    const prefetchKey = `${suggestion.lat.toFixed(3)}:${suggestion.lon.toFixed(3)}`;
    if (prefetchedSuggestionsRef.current.has(prefetchKey)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/weather/prefetch?lat=${encodeURIComponent(String(suggestion.lat))}&lon=${encodeURIComponent(String(suggestion.lon))}`,
        { cache: "no-store" }
      );

      if (response.status === 429) {
        const retryAfterSeconds = parseRetryAfterSeconds(response.headers);
        prefetchCooldownUntilRef.current = Date.now() + retryAfterSeconds * 1000;
        return;
      }

      if (!response.ok) {
        return;
      }

      prefetchedSuggestionsRef.current.add(prefetchKey);
    } catch {
      // Silent by design: background prefetch should never surface errors.
    }
  }, []);

  useEffect(() => {
    let active = true;

    const fallback = () => {
      if (active) {
        void loadWeather({ city: DEFAULT_CITY });
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

        void loadWeather({
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

    if (suppressNextDebounceRef.current) {
      suppressNextDebounceRef.current = false;
      return;
    }

    if (weatherCooldownActive) {
      return;
    }

    void loadWeather({ city: trimmed });
  }, [debouncedQuery, loadWeather, weatherCooldownActive]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();

    if (suppressNextSuggestionsFetchRef.current) {
      suppressNextSuggestionsFetchRef.current = false;
      return;
    }

    if (trimmed.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    const cachedSuggestions = suggestionsCacheRef.current.get(cacheKey);
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions);
      setSuggestionsOpen(true);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);

    fetch(`/api/cities?q=${encodeURIComponent(trimmed)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { suggestions?: CitySuggestion[] };
        if (!response.ok || !Array.isArray(body.suggestions)) {
          throw new Error("Failed to load suggestions");
        }

        if (cancelled) {
          return;
        }

        suggestionsCacheRef.current.set(cacheKey, body.suggestions);
        setSuggestions(body.suggestions);
        setSuggestionsOpen(true);
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSuggestionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

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

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (searchContainerRef.current?.contains(target)) {
        return;
      }

      setSuggestionsOpen(false);
      clearHoverPrefetchTimer();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      clearHoverPrefetchTimer();
    };
  }, [clearHoverPrefetchTimer]);

  const retry = () => {
    if (weatherCooldownActive) {
      return;
    }

    void loadWeather(lastQuery, true);
  };

  const offlineTimestamp = useMemo(() => {
    if (isOnline || !lastUpdatedAt) {
      return null;
    }

    return formatUpdatedText(lastUpdatedAt);
  }, [isOnline, lastUpdatedAt]);

  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full items-end px-0 pb-0 pt-8 md:items-center md:px-6 md:pb-8">
      <DynamicBackground
        condition={weather?.current.condition ?? "Clear"}
        icon={weather?.current.icon ?? "01d"}
        isOffline={!isOnline}
      />
      <WeatherSceneFX
        condition={weather?.current.condition ?? "Clear"}
        icon={weather?.current.icon ?? "01d"}
        isOffline={!isOnline}
      />

      <div className="relative z-10 w-full">
        <div className="mx-auto mb-4 flex w-full max-w-4xl items-center justify-between px-4 md:px-0">
          <p className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 md:flex">
            <Command className="h-3.5 w-3.5" />
            Cmd/Ctrl + K
          </p>

          <div ref={searchContainerRef} className="relative ml-auto max-w-[calc(100vw-2rem)]">
            <SearchBar
              ref={searchRef}
              value={query}
              onChange={(value) => {
                setQuery(value);
                if (value.trim().length >= 2) {
                  setSuggestionsOpen(true);
                }
              }}
              onSubmit={(value) => {
                if (value.length >= 2) {
                  if (weatherCooldownActive) {
                    return;
                  }

                  setSuggestionsOpen(false);
                  suppressNextDebounceRef.current = true;
                  suppressNextSuggestionsFetchRef.current = true;
                  void loadWeather({ city: value }, true);
                }
              }}
              focusTrigger={focusTrigger}
            />

            <AnimatePresence>
              {suggestionsOpen && query.trim().length >= 2 && (suggestionsLoading || suggestions.length > 0) ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.985 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl"
                >
                  {suggestionsLoading ? (
                    <div className="space-y-2 p-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-10 animate-pulse rounded-xl bg-white/10" />
                      ))}
                    </div>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto p-2">
                      {suggestions.map((suggestion) => (
                        <motion.li
                          key={`${suggestion.lat}:${suggestion.lon}`}
                          whileHover={canHover ? { scale: 1.01 } : undefined}
                          whileTap={{ scale: 0.98 }}
                          onMouseEnter={() => {
                            clearHoverPrefetchTimer();
                            hoverPrefetchTimerRef.current = window.setTimeout(() => {
                              void prefetchSuggestion(suggestion);
                            }, 300);
                          }}
                          onMouseLeave={clearHoverPrefetchTimer}
                          onClick={() => {
                            if (weatherCooldownActive) {
                              return;
                            }

                            clearHoverPrefetchTimer();
                            suppressNextDebounceRef.current = true;
                            suppressNextSuggestionsFetchRef.current = true;
                            setSuggestionsOpen(false);
                            setSuggestions([]);
                            setQuery(suggestion.label);
                            void loadWeather({ lat: suggestion.lat, lon: suggestion.lon }, true);
                          }}
                          className="cursor-pointer rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-white/10 hover:bg-white/10"
                        >
                          <p className="text-sm font-medium text-white">{suggestion.name}</p>
                          <p className="text-xs text-white/60">{[suggestion.state, suggestion.country].filter(Boolean).join(", ")}</p>
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
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
                  whileHover={canHover ? { scale: 1.03 } : undefined}
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
              <motion.div variants={cardVariants} initial="hidden" animate="show" className="space-y-6">
                {notice && (
                  <motion.div
                    variants={childVariants}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 shadow-2xl backdrop-blur-2xl"
                  >
                    {notice}
                  </motion.div>
                )}
                {weatherRetryRemaining !== null && (
                  <motion.div
                    variants={childVariants}
                    className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100/90 shadow-2xl backdrop-blur-2xl"
                  >
                    Cooling down requests. Try again in {weatherRetryRemaining}s.
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    variants={childVariants}
                    className="rounded-2xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs text-red-100/90 shadow-2xl backdrop-blur-2xl"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.div variants={childVariants} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-1 text-sm text-white/70">
                      <MapPin className="h-4 w-4 text-sky-200" />
                      {weather.location.name}, {weather.location.country}
                    </p>

                    <h1 className="mt-3 text-6xl font-bold leading-none tracking-tight sm:text-7xl">
                      <AnimatedTemperature value={weather.current.temp} />
                    </h1>

                    <p className="mt-2 text-sm uppercase tracking-wider text-white/65">
                      {weather.current.condition}
                    </p>
                    <p className="mt-1 text-base capitalize text-white/85">
                      {weather.current.description}
                    </p>
                  </div>

                  <div className="self-end sm:self-auto">
                    <LazyWeatherIconMotion condition={weather.current.condition} />
                  </div>
                </motion.div>

                <motion.div variants={childVariants}>
                  <WeatherMetrics
                    humidity={weather.current.humidity}
                    wind={weather.current.wind}
                    pressure={weather.current.pressure}
                    aqi={weather.aqi ?? weather.current.aqi}
                  />
                </motion.div>

                <motion.section
                  variants={childVariants}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-2xl md:p-4"
                >
                  <h2 className="mb-2 text-xs uppercase tracking-widest text-white/60">
                    24-hour temperature trend
                  </h2>
                  <LazyTempTrendChart data={weather.hourly} />
                </motion.section>

                <motion.section variants={childVariants} className="space-y-2">
                  <h2 className="text-xs uppercase tracking-widest text-white/60">Map</h2>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-2xl">
                    <LazyWeatherMap
                      lat={weather.location.lat}
                      lon={weather.location.lon}
                      city={weather.location.name}
                    />
                  </div>
                </motion.section>

                <motion.button
                  variants={childVariants}
                  whileHover={canHover ? { scale: 1.03 } : undefined}
                  whileTap={{ scale: 0.97 }}
                  onClick={retry}
                  disabled={weatherCooldownActive}
                  className="hover-lift inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Refresh
                </motion.button>
              </motion.div>
            ) : null}
          </GlassCard>
        </motion.div>
      </div>

      <AnimatePresence>
        {offlineTimestamp ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="pointer-events-none fixed bottom-3 right-4 z-20 text-[11px] text-white/30"
          >
            {offlineTimestamp}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
