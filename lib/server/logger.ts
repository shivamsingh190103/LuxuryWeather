const isProduction = process.env.NODE_ENV === "production";

export function logServerError(...args: unknown[]) {
  if (!isProduction) {
    console.error(...args);
  }
}

export function logServerWarn(...args: unknown[]) {
  if (!isProduction) {
    console.warn(...args);
  }
}
