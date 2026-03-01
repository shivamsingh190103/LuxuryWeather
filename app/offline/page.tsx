"use client";

import Link from "next/link";
import { CloudOff } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import type { WeatherPayload } from "@/lib/types";

type CachedEntry = {
  timestamp: number;
  data: WeatherPayload;
};

export default function OfflinePage() {
  const [cached, setCached] = useState<CachedEntry | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let newest: CachedEntry | null = null;

    for (const key of Object.keys(window.sessionStorage)) {
      if (!key.startsWith("weather:")) {
        continue;
      }

      const raw = window.sessionStorage.getItem(key);
      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw) as CachedEntry;
        if (
          parsed &&
          typeof parsed.timestamp === "number" &&
          parsed.data &&
          (!newest || parsed.timestamp > newest.timestamp)
        ) {
          newest = parsed;
        }
      } catch {
        // Ignore malformed cache entries.
      }
    }

    setCached(newest);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full items-center justify-center px-4 py-10">
      <GlassCard className="max-w-xl rounded-3xl border p-8 text-center md:rounded-3xl">
        <CloudOff className="mx-auto mb-4 h-12 w-12 text-sky-300" />
        <h1 className="text-2xl font-semibold">You are offline</h1>
        <p className="mt-3 text-sm text-white/75">
          {cached
            ? `Showing cached weather for ${cached.data.location.name}, ${cached.data.location.country}.`
            : "No cached weather is available yet. Reconnect to refresh data."}
        </p>

        {cached && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
            <p className="text-sm text-white/65">
              Cached at {new Date(cached.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="mt-2 text-xl font-semibold">
              {cached.data.location.name}, {cached.data.location.country}
            </p>
            <p className="mt-1 text-5xl font-bold">{Math.round(cached.data.current.temp)}°</p>
            <p className="mt-2 capitalize text-white/85">{cached.data.current.description}</p>
          </div>
        )}

        <Link
          href="/"
          className="hover-lift mt-6 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium text-white"
        >
          Try again
        </Link>
      </GlassCard>
    </main>
  );
}
