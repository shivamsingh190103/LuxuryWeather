"use client";

import { useEffect, useState } from "react";

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

type NavigatorWithHints = Navigator & {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
  deviceMemory?: number;
};

function evaluateLowPowerMode() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true;
  }

  const nav = navigator as NavigatorWithHints;
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  const effectiveType = connection?.effectiveType ?? "";
  const saveDataEnabled = Boolean(connection?.saveData);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const slowNetwork = effectiveType.includes("2g");

  return reducedMotion || saveDataEnabled || lowMemory || slowNetwork;
}

export function useLowPowerMode() {
  const [state, setState] = useState({
    isLowPowerMode: false,
    isResolved: false
  });

  useEffect(() => {
    const update = () =>
      setState({
        isLowPowerMode: evaluateLowPowerMode(),
        isResolved: true
      });
    update();

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nav = navigator as NavigatorWithHints;
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

    media.addEventListener?.("change", update);
    connection?.addEventListener?.("change", update);

    return () => {
      media.removeEventListener?.("change", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  return state;
}
