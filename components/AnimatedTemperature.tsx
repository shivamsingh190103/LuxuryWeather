"use client";

import { AnimatePresence, animate, m } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type AnimatedTemperatureProps = {
  value: number;
  className?: string;
  reducedMotion?: boolean;
};

export function AnimatedTemperature({
  value,
  className = "",
  reducedMotion = false
}: AnimatedTemperatureProps) {
  const roundedTarget = Math.round(value);
  const previous = useRef(roundedTarget);
  const [display, setDisplay] = useState(roundedTarget);

  useEffect(() => {
    if (reducedMotion) {
      previous.current = roundedTarget;
      setDisplay(roundedTarget);
      return;
    }

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
  }, [roundedTarget, reducedMotion]);

  if (reducedMotion) {
    return <span className={className}>{display}°</span>;
  }

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
