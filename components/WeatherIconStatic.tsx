"use client";

import { m } from "framer-motion";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind
} from "lucide-react";
import { useMemo } from "react";

type WeatherIconStaticProps = {
  condition: string;
  animated?: boolean;
};

function resolveFallbackIcon(normalized: string) {
  if (normalized.includes("clear")) {
    return <Sun className="h-14 w-14 text-amber-300" />;
  }
  if (
    normalized.includes("thunder") ||
    normalized.includes("squall") ||
    normalized.includes("tornado")
  ) {
    return <CloudLightning className="h-14 w-14 text-yellow-300" />;
  }
  if (normalized.includes("rain") || normalized.includes("drizzle")) {
    return <CloudRain className="h-14 w-14 text-sky-300" />;
  }
  if (normalized.includes("snow")) {
    return <CloudSnow className="h-14 w-14 text-blue-100" />;
  }
  if (
    normalized.includes("mist") ||
    normalized.includes("fog") ||
    normalized.includes("haze") ||
    normalized.includes("smoke") ||
    normalized.includes("dust") ||
    normalized.includes("sand") ||
    normalized.includes("ash")
  ) {
    return <CloudFog className="h-14 w-14 text-slate-200" />;
  }
  if (normalized.includes("wind")) {
    return <Wind className="h-14 w-14 text-slate-100" />;
  }
  return <Cloud className="h-14 w-14 text-slate-100" />;
}

export function WeatherIconStatic({ condition, animated = true }: WeatherIconStaticProps) {
  const normalized = useMemo(() => condition.trim().toLowerCase(), [condition]);
  const fallbackIcon = useMemo(() => resolveFallbackIcon(normalized), [normalized]);

  const iconMotion = useMemo(() => {
    if (!animated) {
      return {
        animate: undefined,
        transition: undefined
      };
    }

    if (normalized.includes("clear") || normalized.includes("sun")) {
      return {
        animate: { y: [0, -4, 0], rotate: [0, 3, 0] },
        transition: { repeat: Infinity, duration: 8, ease: "easeInOut" as const }
      };
    }

    return {
      animate: { y: [0, -6, 0] },
      transition: { repeat: Infinity, duration: 4.6, ease: "easeInOut" as const }
    };
  }, [normalized, animated]);

  return (
    <m.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative flex h-24 w-24 items-center justify-center"
    >
      <m.div animate={iconMotion.animate} transition={iconMotion.transition}>
        {fallbackIcon}
      </m.div>
    </m.div>
  );
}
