"use client";

import { m } from "framer-motion";
import { useLottie } from "lottie-react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type WeatherIconMotionProps = {
  condition: string;
};

type AnimationKey = "clear" | "clouds" | "rain" | "snow" | "thunderstorm" | "drizzle" | "fog";

const animationImporters: Record<AnimationKey, () => Promise<{ default: object }>> = {
  clear: () => import("@/public/lottie/sun.json"),
  clouds: () => import("@/public/lottie/cloud.json"),
  rain: () => import("@/public/lottie/rain.json"),
  snow: () => import("@/public/lottie/snow.json"),
  thunderstorm: () => import("@/public/lottie/thunder.json"),
  drizzle: () => import("@/public/lottie/drizzle.json"),
  fog: () => import("@/public/lottie/fog.json")
};

const animationCache = new Map<AnimationKey, object>();

function resolveAnimationKey(normalized: string): AnimationKey {
  if (normalized.includes("thunder") || normalized.includes("squall") || normalized.includes("tornado")) {
    return "thunderstorm";
  }
  if (normalized.includes("rain")) {
    return "rain";
  }
  if (normalized.includes("drizzle")) {
    return "drizzle";
  }
  if (normalized.includes("snow")) {
    return "snow";
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
    return "fog";
  }
  if (normalized.includes("cloud")) {
    return "clouds";
  }
  return "clear";
}

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

function LottieLayer({ animationData }: { animationData: object }) {
  const { View } = useLottie({
    animationData,
    loop: true,
    autoplay: true,
    style: {
      width: 96,
      height: 96
    }
  });

  return <div className="relative z-10">{View}</div>;
}

export function WeatherIconMotion({ condition }: WeatherIconMotionProps) {
  const normalized = useMemo(() => condition.trim().toLowerCase(), [condition]);
  const animationKey = useMemo(() => resolveAnimationKey(normalized), [normalized]);
  const fallbackIcon = useMemo(() => resolveFallbackIcon(normalized), [normalized]);
  const [animationData, setAnimationData] = useState<object | null>(
    animationCache.get(animationKey) ?? null
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);

    const cached = animationCache.get(animationKey);
    if (cached) {
      setAnimationData(cached);
      return () => {
        active = false;
      };
    }

    setAnimationData(null);

    const loadAnimation = async () => {
      try {
        const animationModule = await animationImporters[animationKey]();
        const data = (animationModule.default ?? animationModule) as object;
        animationCache.set(animationKey, data);
        if (active) {
          setAnimationData(data);
        }
      } catch {
        if (active) {
          setFailed(true);
          setAnimationData(null);
        }
      }
    };

    void loadAnimation();

    return () => {
      active = false;
    };
  }, [animationKey]);

  return (
    <m.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className="relative flex h-24 w-24 items-center justify-center"
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-45">{fallbackIcon}</div>
      {!failed && animationData ? <LottieLayer animationData={animationData} /> : null}
    </m.div>
  );
}
