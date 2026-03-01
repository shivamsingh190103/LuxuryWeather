import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "@/lib/server/redis";
import { logServerError } from "@/lib/server/logger";

export type RateLimitTarget = "weather" | "cities" | "prefetch";

type RateLimitResult = {
  allowed: boolean;
  headers: Record<string, string>;
};

const configByTarget: Record<RateLimitTarget, { max: number; window: `${number} ${"s" | "m" | "h"}` }> = {
  weather: { max: 120, window: "1 m" },
  cities: { max: 90, window: "1 m" },
  prefetch: { max: 60, window: "1 m" }
};

const ratelimitStore = new Map<RateLimitTarget, Ratelimit>();
const localLimiterStore = new Map<string, { count: number; resetAt: number }>();

function parseWindowMs(window: `${number} ${"s" | "m" | "h"}`) {
  const [amountRaw, unit] = window.split(" ");
  const amount = Number(amountRaw);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 60_000;
  }

  if (unit === "s") {
    return amount * 1_000;
  }

  if (unit === "h") {
    return amount * 60 * 60 * 1_000;
  }

  return amount * 60 * 1_000;
}

function cleanupLocalLimiterStore(now: number) {
  if (localLimiterStore.size < 1_500) {
    return;
  }

  for (const [key, entry] of localLimiterStore) {
    if (entry.resetAt <= now) {
      localLimiterStore.delete(key);
    }
  }
}

function enforceLocalRateLimit(
  target: RateLimitTarget,
  identifier: string
): RateLimitResult {
  const config = configByTarget[target];
  const windowMs = parseWindowMs(config.window);
  const now = Date.now();
  const bucketKey = `${target}:${identifier}`;
  const existing = localLimiterStore.get(bucketKey);
  const base =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + windowMs
        };

  base.count += 1;
  localLimiterStore.set(bucketKey, base);
  cleanupLocalLimiterStore(now);

  const allowed = base.count <= config.max;
  const remaining = Math.max(0, config.max - base.count);
  const headers: Record<string, string> = {
    "x-rate-limit": allowed ? "PASS_LOCAL" : "BLOCK_LOCAL",
    "x-rate-limit-limit": String(config.max),
    "x-rate-limit-remaining": String(remaining),
    "x-rate-limit-reset": String(base.resetAt)
  };

  if (!allowed) {
    headers["retry-after"] = String(Math.max(1, Math.ceil((base.resetAt - now) / 1000)));
  }

  return {
    allowed,
    headers
  };
}

function getLimiter(target: RateLimitTarget) {
  const existing = ratelimitStore.get(target);
  if (existing) {
    return existing;
  }

  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const config = configByTarget[target];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.max, config.window),
    analytics: false,
    prefix: `luxury-weather:${target}`
  });

  ratelimitStore.set(target, limiter);
  return limiter;
}

export async function enforceRateLimit(
  target: RateLimitTarget,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getLimiter(target);

  if (!limiter) {
    return enforceLocalRateLimit(target, identifier);
  }

  try {
    const result = await limiter.limit(identifier);

    const headers: Record<string, string> = {
      "x-rate-limit": result.success ? "PASS" : "BLOCK",
      "x-rate-limit-limit": String(result.limit),
      "x-rate-limit-remaining": String(result.remaining),
      "x-rate-limit-reset": String(result.reset)
    };

    if (!result.success) {
      headers["retry-after"] = String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)));
    }

    return {
      allowed: result.success,
      headers
    };
  } catch (error) {
    logServerError(`Rate limiter failed for ${target}. Falling back to local limiter.`, error);
    return enforceLocalRateLimit(target, identifier);
  }
}

export function getRequestIdentifier(request: Request) {
  const nextRequestIp = (request as Request & { ip?: string }).ip?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for")?.trim();
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const forwardedChain = xForwardedFor
    ? xForwardedFor
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
  const trustedForwardedIp =
    forwardedChain.length > 0 ? forwardedChain[forwardedChain.length - 1] : null;

  return nextRequestIp || realIp || vercelForwarded || trustedForwardedIp || "127.0.0.1";
}
