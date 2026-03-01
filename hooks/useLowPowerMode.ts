"use client";

import { useEffect, useState } from "react";

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

type BatteryChangeEvent = "chargingchange" | "levelchange";

type BatteryManagerLike = {
  charging: boolean;
  level: number;
  addEventListener?: (type: BatteryChangeEvent, listener: () => void) => void;
  removeEventListener?: (type: BatteryChangeEvent, listener: () => void) => void;
};

type NavigatorWithHints = Navigator & {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
  deviceMemory?: number;
  getBattery?: () => Promise<BatteryManagerLike>;
};

function evaluateLowPowerMode(batteryLow = false) {
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

  return reducedMotion || saveDataEnabled || lowMemory || slowNetwork || batteryLow;
}

function isBatteryLow(battery: BatteryManagerLike) {
  return battery.charging === false && battery.level <= 0.2;
}

export function useLowPowerMode() {
  const [state, setState] = useState({
    isLowPowerMode: false,
    isResolved: false
  });

  useEffect(() => {
    let mounted = true;
    let battery: BatteryManagerLike | null = null;
    let removeBatteryListeners: (() => void) | undefined;

    const update = () => {
      if (!mounted) {
        return;
      }

      setState({
        isLowPowerMode: evaluateLowPowerMode(battery ? isBatteryLow(battery) : false),
        isResolved: true
      });
    };

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      update();
      return;
    }

    update();

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nav = navigator as NavigatorWithHints;
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

    media.addEventListener?.("change", update);
    connection?.addEventListener?.("change", update);

    if (typeof nav.getBattery === "function") {
      void nav
        .getBattery()
        .then((batteryManager) => {
          if (!mounted) {
            return;
          }

          battery = batteryManager;
          const onBatteryUpdate = () => update();

          battery.addEventListener?.("chargingchange", onBatteryUpdate);
          battery.addEventListener?.("levelchange", onBatteryUpdate);
          removeBatteryListeners = () => {
            battery?.removeEventListener?.("chargingchange", onBatteryUpdate);
            battery?.removeEventListener?.("levelchange", onBatteryUpdate);
          };

          update();
        })
        .catch(() => {
          // Battery API unavailable or blocked.
        });
    }

    return () => {
      mounted = false;
      media.removeEventListener?.("change", update);
      connection?.removeEventListener?.("change", update);
      removeBatteryListeners?.();
    };
  }, []);

  return state;
}
