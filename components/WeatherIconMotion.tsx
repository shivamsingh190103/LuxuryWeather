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
import cloudAnimation from "@/public/lottie/cloud.json";
import drizzleAnimation from "@/public/lottie/drizzle.json";
import fogAnimation from "@/public/lottie/fog.json";
import rainAnimation from "@/public/lottie/rain.json";
import snowAnimation from "@/public/lottie/snow.json";
import sunAnimation from "@/public/lottie/sun.json";
import thunderAnimation from "@/public/lottie/thunder.json";
import { useMemo } from "react";

type WeatherIconMotionProps = {
  condition: string;
  reducedMotion?: boolean;
};

const animationMap = {
  clear: sunAnimation,
  clouds: cloudAnimation,
  rain: rainAnimation,
  snow: snowAnimation,
  thunderstorm: thunderAnimation,
  drizzle: drizzleAnimation,
  fog: fogAnimation
};

export function WeatherIconMotion({ condition, reducedMotion = false }: WeatherIconMotionProps) {
  const normalized = useMemo(() => condition.trim().toLowerCase(), [condition]);

  const animationData = useMemo(() => {
    const weatherGroups: Array<[string[], object]> = [
      [["thunder", "squall", "tornado"], animationMap.thunderstorm],
      [["rain"], animationMap.rain],
      [["drizzle"], animationMap.drizzle],
      [["snow"], animationMap.snow],
      [["mist", "fog", "haze", "smoke", "dust", "sand", "ash"], animationMap.fog],
      [["cloud"], animationMap.clouds],
      [["clear", "sun"], animationMap.clear]
    ];

    const match = weatherGroups.find(([keywords]) =>
      keywords.some((keyword) => normalized.includes(keyword))
    );

    return match?.[1] ?? animationMap.clear;
  }, [normalized]);

  const fallbackIcon = useMemo(() => {
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
  }, [normalized]);

  const iconMotion = useMemo(() => {
    if (normalized.includes("clear") || normalized.includes("sun")) {
      return reducedMotion
        ? {
            animate: { y: 0, rotate: 0 },
            transition: { duration: 0 }
          }
        : {
        animate: { y: [0, -4, 0], rotate: [0, 3, 0] },
        transition: { repeat: Infinity, duration: 8, ease: "easeInOut" as const }
      };
    }

    return reducedMotion
      ? {
          animate: { y: 0 },
          transition: { duration: 0 }
        }
      : {
      animate: { y: [0, -6, 0] },
      transition: { repeat: Infinity, duration: 4.6, ease: "easeInOut" as const }
    };
  }, [normalized, reducedMotion]);

  const { View } = useLottie({
    animationData,
    loop: !reducedMotion,
    autoplay: !reducedMotion,
    style: {
      width: 96,
      height: 96
    }
  });

  return (
    <m.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className="relative flex h-24 w-24 items-center justify-center"
    >
      <m.div
        animate={iconMotion.animate}
        transition={iconMotion.transition}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className={reducedMotion ? "opacity-100" : "opacity-45"}>{fallbackIcon}</div>
      </m.div>
      {!reducedMotion ? <div className="relative z-10">{View}</div> : null}
    </m.div>
  );
}
