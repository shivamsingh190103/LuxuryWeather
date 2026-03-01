"use client";

import { motion } from "framer-motion";
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

const lottieMap: Record<string, string> = {
  clear: "/lottie/sun.json",
  clouds: "/lottie/cloud.json",
  rain: "/lottie/rain.json",
  snow: "/lottie/snow.json",
  thunderstorm: "/lottie/thunder.json",
  drizzle: "/lottie/drizzle.json",
  mist: "/lottie/fog.json",
  fog: "/lottie/fog.json",
  haze: "/lottie/fog.json",
  smoke: "/lottie/fog.json",
  dust: "/lottie/fog.json",
  sand: "/lottie/fog.json",
  ash: "/lottie/fog.json",
  squall: "/lottie/thunder.json",
  tornado: "/lottie/thunder.json"
};

const EMPTY_ANIMATION = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 1,
  w: 1,
  h: 1,
  nm: "empty",
  ddd: 0,
  assets: [],
  layers: []
};

export function WeatherIconMotion({ condition }: WeatherIconMotionProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [failed, setFailed] = useState(false);

  const normalized = useMemo(() => condition.trim().toLowerCase(), [condition]);

  const lottiePath = useMemo(() => {
    const weatherGroups: Array<[string[], string]> = [
      [["thunder", "squall", "tornado"], lottieMap.thunderstorm],
      [["rain"], lottieMap.rain],
      [["drizzle"], lottieMap.drizzle],
      [["snow"], lottieMap.snow],
      [["mist", "fog", "haze", "smoke", "dust", "sand", "ash"], lottieMap.fog],
      [["cloud"], lottieMap.clouds],
      [["clear", "sun"], lottieMap.clear]
    ];

    const match = weatherGroups.find(([keywords]) =>
      keywords.some((keyword) => normalized.includes(keyword))
    );

    return match?.[1];
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

  const { View } = useLottie({
    animationData: animationData ?? EMPTY_ANIMATION,
    loop: true,
    autoplay: true,
    style: {
      width: 96,
      height: 96
    }
  });

  useEffect(() => {
    if (!lottiePath) {
      setAnimationData(null);
      setFailed(true);
      return;
    }

    const controller = new AbortController();
    setFailed(false);
    setAnimationData(null);

    fetch(lottiePath, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${lottiePath}`);
        }
        return response.json();
      })
      .then((data) => setAnimationData(data as object))
      .catch(() => {
        if (!controller.signal.aborted) {
          setAnimationData(null);
          setFailed(true);
        }
      });

    return () => controller.abort();
  }, [lottiePath]);

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className="relative flex h-24 w-24 items-center justify-center"
    >
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {fallbackIcon}
      </motion.div>
      {!failed && animationData ? (
        <div className="relative z-10">{View}</div>
      ) : (
        <div className="relative z-10 h-14 w-14" />
      )}
    </motion.div>
  );
}
