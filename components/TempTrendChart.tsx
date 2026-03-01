"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { HourlyPoint } from "@/lib/types";

type TempTrendChartProps = {
  data: HourlyPoint[];
};

type TrendRow = {
  index: number;
  ts: number;
  label: string;
  temp: number;
  showTick: boolean;
};

function formatHour(unix: number) {
  return new Date(unix * 1000).toLocaleTimeString([], {
    hour: "numeric"
  });
}

function formatDetailedHour(unix: number) {
  return new Date(unix * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function TempTrendChart({ data }: TempTrendChartProps) {
  const safeData = data.length > 0 ? data : [{ ts: Date.now() / 1000, temp: 0, condition: "Unknown", icon: "01d" }];

  const tickStep = safeData.length > 16 ? 4 : safeData.length > 10 ? 3 : 2;

  const chartData: TrendRow[] = safeData.map((point, index) => ({
    index,
    ts: point.ts,
    label: formatHour(point.ts),
    temp: point.temp,
    showTick: index % tickStep === 0 || index === safeData.length - 1
  }));

  const temps = chartData.map((row) => row.temp);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const currentTemp = chartData[0]?.temp ?? 0;
  const rangePadding = Math.max(1, Math.round((maxTemp - minTemp) * 0.2));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] text-white/70">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Now {Math.round(currentTemp)}°</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Low {Math.round(minTemp)}°</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">High {Math.round(maxTemp)}°</span>
      </div>

      <div className="overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="h-52 min-w-[720px] md:min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 8, left: -18, bottom: 14 }}
            >
              <defs>
                <linearGradient id="tempGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.75} />
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 6" />

              <XAxis
                dataKey="index"
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={({ x, y, payload }) => {
                  const row = chartData[payload.value as number];
                  if (!row || !row.showTick) {
                    return <g />;
                  }
                  return (
                    <text x={x} y={y + 12} textAnchor="middle" fill="rgba(255,255,255,0.62)" fontSize={11}>
                      {row.label}
                    </text>
                  );
                }}
              />

              <YAxis
                width={38}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(255,255,255,0.56)", fontSize: 11 }}
                tickFormatter={(value: number) => `${Math.round(value)}°`}
                domain={[Math.floor(minTemp - rangePadding), Math.ceil(maxTemp + rangePadding)]}
                tickCount={4}
              />

              <Tooltip
                contentStyle={{
                  background: "rgba(12, 18, 42, 0.88)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "12px",
                  color: "#f8fbff",
                  backdropFilter: "blur(8px)",
                  fontSize: "12px"
                }}
                labelFormatter={(value) => {
                  const row = chartData[value as number];
                  return row ? formatDetailedHour(row.ts) : "";
                }}
                formatter={(value: number) => [`${Math.round(value)}°C`, "Temperature"]}
                cursor={{ stroke: "rgba(125,211,252,0.65)", strokeDasharray: "4 4" }}
              />

              <Area
                type="monotone"
                dataKey="temp"
                stroke="#7dd3fc"
                strokeWidth={3}
                fill="url(#tempGlow)"
                dot={false}
                activeDot={{ r: 4, fill: "#e0f2fe", stroke: "#7dd3fc", strokeWidth: 2 }}
                isAnimationActive
                animationDuration={650}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-[11px] text-white/55">Time is shown in your local timezone.</p>
    </div>
  );
}
