"use client";

import { AnimatePresence, animate, m } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type AnimatedTemperatureProps = {
  value: number;
  className?: string;
};

export function AnimatedTemperature({ value, className = "" }: AnimatedTemperatureProps) {
  const roundedTarget = Math.round(value);
  const previous = useRef(roundedTarget);
  const [display, setDisplay] = useState(roundedTarget);

  useEffect(() => {
    const controls = animate(previous.current, roundedTarget, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplay(Math.round(latest));
      }
    });

    previous.current = roundedTarget;

    return () => {
      controls.stop();
    };
  }, [roundedTarget]);

  return (
    <AnimatePresence mode="wait">
      <m.span
        key={roundedTarget}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className={className}
      >
        {display}°
      </m.span>
    </AnimatePresence>
  );
}
