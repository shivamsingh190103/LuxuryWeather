"use client";

import { m } from "framer-motion";
import type { PropsWithChildren } from "react";

type GlassCardProps = PropsWithChildren<{
  className?: string;
}>;

export function GlassCard({ className = "", children }: GlassCardProps) {
  return (
    <m.section
      whileTap={{ scale: 0.97 }}
      className={`glass-card w-full rounded-t-3xl border border-white/10 bg-white/5 px-5 pb-6 pt-6 shadow-2xl backdrop-blur-2xl md:mx-auto md:max-w-4xl md:rounded-3xl ${className}`}
    >
      {children}
    </m.section>
  );
}
