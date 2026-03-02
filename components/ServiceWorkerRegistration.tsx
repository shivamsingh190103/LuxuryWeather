"use client";

import { useEffect } from "react";

function canRegisterServiceWorker() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!("serviceWorker" in navigator)) {
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const isHttps = window.location.protocol === "https:";
  const isLocalhost = window.location.hostname === "localhost";

  return isHttps || isLocalhost;
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!canRegisterServiceWorker()) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silent by design: app remains usable without SW registration.
    });
  }, []);

  return null;
}
