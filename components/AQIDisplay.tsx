"use client";

import { m } from "framer-motion";
import { Activity } from "lucide-react";
import { useCanHover } from "@/hooks/useCanHover";

type AQIDisplayProps = {
  aqi?: number;
};

const aqiLevels = [
  { label: "Good", color: "text-emerald-300", bg: "bg-emerald-400/15" },
  { label: "Fair", color: "text-yellow-300", bg: "bg-yellow-400/15" },
  { label: "Moderate", color: "text-orange-300", bg: "bg-orange-400/15" },
  { label: "Poor", color: "text-rose-300", bg: "bg-rose-400/15" },
  { label: "Very Poor", color: "text-fuchsia-300", bg: "bg-fuchsia-400/15" }
] as const;

export function AQIDisplay({ aqi }: AQIDisplayProps) {
  const canHover = useCanHover();

  if (typeof aqi !== "number") {
    return (
      <m.div
        whileHover={canHover ? { scale: 1.02 } : undefined}
        whileTap={{ scale: 0.97 }}
        className="hover-lift rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-2xl"
      >
        <Activity className="h-4 w-4 text-sky-200" />
        <p className="mt-2 text-[11px] uppercase tracking-wide text-white/60">Air Quality</p>
        <p className="mt-1 text-sm font-semibold text-white">N/A</p>
      </m.div>
    );
  }

  const level = aqiLevels[Math.max(1, Math.min(5, aqi)) - 1];

  return (
    <m.div
      whileHover={canHover ? { scale: 1.02 } : undefined}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`hover-lift rounded-2xl border border-white/10 p-3 shadow-2xl backdrop-blur-2xl ${level.bg}`}
    >
      <Activity className={`h-4 w-4 ${level.color}`} />
      <p className="mt-2 text-[11px] uppercase tracking-wide text-white/60">Air Quality</p>
      <p className={`mt-1 text-sm font-semibold ${level.color}`}>
        {aqi} · {level.label}
      </p>
    </m.div>
  );
}
