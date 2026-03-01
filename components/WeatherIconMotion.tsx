"use client";

import { m } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { DotLottie } from "@lottiefiles/dotlottie-react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WeatherIconMotionProps = {
  condition: string;
};

type AnimationKey = "clear" | "clouds" | "rain" | "snow" | "thunderstorm" | "drizzle" | "fog";

const animationSrcByKey: Record<AnimationKey, string> = {
  clear: "/lottie/sun.lottie",
  clouds: "/lottie/cloud.lottie",
  rain: "/lottie/rain.lottie",
  snow: "/lottie/snow.lottie",
  thunderstorm: "/lottie/thunder.lottie",
  drizzle: "/lottie/drizzle.lottie",
  fog: "/lottie/fog.lottie"
};

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

export function WeatherIconMotion({ condition }: WeatherIconMotionProps) {
  const normalized = useMemo(() => condition.trim().toLowerCase(), [condition]);
  const animationKey = useMemo(() => resolveAnimationKey(normalized), [normalized]);
  const animationSrc = useMemo(() => animationSrcByKey[animationKey], [animationKey]);
  const fallbackIcon = useMemo(() => resolveFallbackIcon(normalized), [normalized]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setFailed(false);
  }, [animationKey]);

  const handleDotLottieRef = useCallback((instance: DotLottie | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;

    if (!instance) {
      return;
    }

    const handleLoad = () => {
      setIsLoaded(true);
      setFailed(false);
    };

    const handleLoadError = () => {
      setFailed(true);
      setIsLoaded(false);
    };

    instance.addEventListener("load", handleLoad);
    instance.addEventListener("loadError", handleLoadError);

    cleanupRef.current = () => {
      instance.removeEventListener("load", handleLoad);
      instance.removeEventListener("loadError", handleLoadError);
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  return (
    <m.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className="relative flex h-24 w-24 items-center justify-center"
    >
      {!isLoaded || failed ? (
        <div className="absolute inset-0 flex items-center justify-center">{fallbackIcon}</div>
      ) : null}
      {!failed ? (
        <DotLottieReact
          src={animationSrc}
          loop
          autoplay
          dotLottieRefCallback={handleDotLottieRef}
          className={`relative z-10 h-24 w-24 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </m.div>
  );
}
