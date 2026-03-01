"use client";

import { motion } from "framer-motion";
import { Droplets, Gauge, Wind } from "lucide-react";
import { AQIDisplay } from "@/components/AQIDisplay";

type WeatherMetricsProps = {
  humidity: number;
  wind: number;
  pressure: number;
  aqi?: number;
};

export function WeatherMetrics({ humidity, wind, pressure, aqi }: WeatherMetricsProps) {
  const metrics = [
    {
      icon: Droplets,
      label: "Humidity",
      value: `${humidity}%`
    },
    {
      icon: Wind,
      label: "Wind",
      value: `${wind} m/s`
    },
    {
      icon: Gauge,
      label: "Pressure",
      value: `${pressure} hPa`
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {metrics.map((metric) => (
        <motion.div
          key={metric.label}
          whileTap={{ scale: 0.97 }}
          className="hover-lift rounded-2xl border border-white/10 bg-white/5 p-3"
        >
          <metric.icon className="h-4 w-4 text-sky-200" />
          <p className="mt-2 text-[11px] uppercase tracking-wide text-white/60">{metric.label}</p>
          <p className="mt-1 text-sm font-semibold text-white">{metric.value}</p>
        </motion.div>
      ))}
      <AQIDisplay aqi={aqi} />
    </div>
  );
}
