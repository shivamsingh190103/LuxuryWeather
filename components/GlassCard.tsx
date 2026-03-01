"use client";

import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";

type GlassCardProps = PropsWithChildren<{
  className?: string;
}>;

export function GlassCard({ className = "", children }: GlassCardProps) {
  return (
    <motion.section
      whileTap={{ scale: 0.97 }}
      className={`glass-card w-full rounded-t-3xl border-t border-white/10 px-5 pb-6 pt-6 md:mx-auto md:max-w-4xl md:rounded-3xl md:border ${className}`}
    >
      {children}
    </motion.section>
  );
}
