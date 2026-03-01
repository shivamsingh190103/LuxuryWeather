"use client";

import { AnimatePresence, m, useScroll, useTransform } from "framer-motion";
import { useMemo } from "react";
import { useCanHover } from "@/hooks/useCanHover";

type DynamicBackgroundProps = {
  condition: string;
  icon?: string;
  isOffline?: boolean;
  reducedMotion?: boolean;
};

type SceneMode =
  | "clear-night"
  | "clear-day"
  | "snow"
  | "rain"
  | "thunder"
  | "fog"
  | "clouds"
  | "default-night"
  | "default-day";

type BackgroundTheme = {
  gradient: string;
  glow: string;
  veil: string;
};

const BACKGROUND_THEMES: Record<SceneMode, BackgroundTheme> = {
  "clear-night": {
    gradient:
      "radial-gradient(120% 90% at 80% 10%, rgba(82,129,255,0.18), transparent 54%), radial-gradient(100% 120% at 0% 100%, rgba(48,70,170,0.24), transparent 62%), linear-gradient(150deg, #020615 0%, #081431 40%, #112961 100%)",
    glow: "radial-gradient(circle at 78% 20%, rgba(138, 180, 255, 0.28), transparent 60%)",
    veil: "radial-gradient(100% 100% at 50% 50%, rgba(14, 27, 59, 0.15), rgba(2, 6, 20, 0.55))"
  },
  "clear-day": {
    gradient:
      "radial-gradient(120% 80% at 85% 5%, rgba(255,220,150,0.2), transparent 50%), radial-gradient(110% 130% at 5% 95%, rgba(125,211,252,0.24), transparent 64%), linear-gradient(165deg, #224b89 0%, #1a3f7d 35%, #103363 100%)",
    glow: "radial-gradient(circle at 76% 16%, rgba(255, 230, 168, 0.34), transparent 58%)",
    veil: "radial-gradient(100% 100% at 50% 50%, rgba(32, 76, 141, 0.14), rgba(10, 27, 60, 0.45))"
  },
  snow: {
    gradient:
      "radial-gradient(120% 80% at 50% 0%, rgba(220,237,255,0.2), transparent 52%), radial-gradient(130% 140% at 0% 100%, rgba(156,188,222,0.18), transparent 62%), linear-gradient(160deg, #1a3352 0%, #20476f 44%, #1a3c5f 100%)",
    glow: "radial-gradient(circle at 50% 18%, rgba(225, 240, 255, 0.2), transparent 62%)",
    veil: "radial-gradient(100% 100% at 50% 50%, rgba(35, 58, 83, 0.2), rgba(7, 17, 35, 0.46))"
  },
  rain: {
    gradient:
      "radial-gradient(120% 90% at 60% 0%, rgba(129,184,237,0.12), transparent 52%), radial-gradient(110% 130% at 100% 100%, rgba(43,83,132,0.18), transparent 62%), linear-gradient(155deg, #0f213f 0%, #122c52 38%, #0c2546 100%)",
    glow: "radial-gradient(circle at 68% 24%, rgba(125, 211, 252, 0.18), transparent 58%)",
    veil: "radial-gradient(100% 100% at 50% 50%, rgba(10, 24, 46, 0.24), rgba(2, 8, 24, 0.52))"
  },
  thunder: {
    gradient:
      "radial-gradient(120% 90% at 70% 0%, rgba(254,240,138,0.08), transparent 45%), radial-gradient(110% 130% at 0% 100%, rgba(53,76,124,0.2), transparent 62%), linear-gradient(160deg, #0d1730 0%, #17274a 42%, #111f3c 100%)",
    glow: "radial-gradient(circle at 75% 22%, rgba(253, 224, 71, 0.16), transparent 56%)",
    veil: "radial-gradient(100% 100% at 50% 50%, rgba(7, 13, 28, 0.24), rgba(2, 5, 15, 0.56))"
  },
  fog: {
    gradient:
      "radial-gradient(120% 90% at 50% 0%, rgba(189,206,226,0.16), transparent 56%), radial-gradient(140% 120% at 10% 100%, rgba(148,163,184,0.14), transparent 66%), linear-gradient(160deg, #16263f 0%, #213754 46%, #1a2f4c 100%)",
    glow: "radial-gradient(circle at 55% 24%, rgba(219, 234, 254, 0.14), transparent 58%)",
    veil: "radial-gradient(100% 100% at 50% 50%, rgba(35, 52, 72, 0.2), rgba(8, 16, 33, 0.5))"
  },
  clouds: {
    gradient:
      "radial-gradient(120% 90% at 62% 0%, rgba(176,194,222,0.12), transparent 56%), radial-gradient(140% 120% at 0% 100%, rgba(117,149,191,0.15), transparent 65%), linear-gradient(160deg, #122949 0%, #1b3962 45%, #153154 100%)",
    glow: "radial-gradient(circle at 58% 22%, rgba(191, 219, 254, 0.14), transparent 60%)",
    veil: "radial-gradient(100% 100% at 50% 50%, rgba(20, 39, 68, 0.18), rgba(6, 13, 29, 0.5))"
  },
  "default-night": {
    gradient:
      "radial-gradient(120% 90% at 74% 0%, rgba(125,165,255,0.14), transparent 56%), radial-gradient(110% 130% at 0% 100%, rgba(79,110,182,0.16), transparent 62%), linear-gradient(155deg, #07112b 0%, #11254b 40%, #152f5e 100%)",
    glow: "radial-gradient(circle at 72% 20%, rgba(147, 197, 253, 0.2), transparent 58%)",
    veil: "radial-gradient(100% 100% at 50% 50%, rgba(12, 27, 54, 0.2), rgba(2, 6, 18, 0.54))"
  },
  "default-day": {
    gradient:
      "radial-gradient(120% 90% at 75% 0%, rgba(125,211,252,0.14), transparent 56%), radial-gradient(130% 120% at 0% 100%, rgba(96,165,250,0.16), transparent 64%), linear-gradient(160deg, #143666 0%, #1f4d87 45%, #174176 100%)",
    glow: "radial-gradient(circle at 72% 20%, rgba(186, 230, 253, 0.24), transparent 56%)",
    veil: "radial-gradient(100% 100% at 50% 50%, rgba(17, 54, 98, 0.14), rgba(4, 17, 40, 0.46))"
  }
};

function resolveScene(condition: string, isNight: boolean): SceneMode {
  if (condition.includes("thunder") || condition.includes("squall") || condition.includes("tornado")) {
    return "thunder";
  }

  if (condition.includes("snow") || condition.includes("sleet")) {
    return "snow";
  }

  if (condition.includes("rain") || condition.includes("drizzle")) {
    return "rain";
  }

  if (
    condition.includes("mist") ||
    condition.includes("fog") ||
    condition.includes("haze") ||
    condition.includes("smoke") ||
    condition.includes("dust") ||
    condition.includes("sand") ||
    condition.includes("ash")
  ) {
    return "fog";
  }

  if (condition.includes("cloud")) {
    return "clouds";
  }

  if (condition.includes("clear") || condition.includes("sun")) {
    return isNight ? "clear-night" : "clear-day";
  }

  return isNight ? "default-night" : "default-day";
}

export function DynamicBackground({
  condition,
  icon,
  isOffline = false,
  reducedMotion = false
}: DynamicBackgroundProps) {
  const canHover = useCanHover();
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 1200], [0, -48]);
  const softParallaxY = useTransform(scrollY, [0, 1200], [0, -24]);

  const scene = useMemo(() => {
    const normalized = condition.trim().toLowerCase();
    const isNight = (icon ?? "").toLowerCase().endsWith("n");
    return resolveScene(normalized, isNight);
  }, [condition, icon]);

  const theme = BACKGROUND_THEMES[scene];

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <AnimatePresence mode="wait">
        <m.div
          key={scene}
          initial={reducedMotion ? false : { opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0, scale: 0.985 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 1.05, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{
            y: canHover && !reducedMotion ? parallaxY : undefined,
            backgroundImage: theme.gradient,
            filter: isOffline ? "grayscale(0.5) saturate(0.72)" : undefined,
            transition: reducedMotion ? "filter 240ms ease" : "filter 800ms ease"
          }}
        />
      </AnimatePresence>

      <m.div
        className="absolute inset-0"
        style={{
          y: canHover && !reducedMotion ? softParallaxY : undefined,
          backgroundImage: theme.glow,
          opacity: isOffline ? 0.5 : 0.95,
          transition: reducedMotion ? "opacity 240ms ease" : "opacity 800ms ease"
        }}
      />

      <m.div
        className="absolute inset-0"
        style={{
          backgroundImage: theme.veil,
          opacity: isOffline ? 0.85 : 1,
          transition: reducedMotion ? "opacity 240ms ease" : "opacity 800ms ease"
        }}
      />
    </div>
  );
}
