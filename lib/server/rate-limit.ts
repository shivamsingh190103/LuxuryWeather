import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "@/lib/server/redis";

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
    return {
      allowed: true,
      headers: {
        "x-rate-limit": "BYPASS"
      }
    };
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
    console.error(`Rate limiter failed for ${target}. Falling back to allow.`, error);
    return {
      allowed: true,
      headers: {
        "x-rate-limit": "BYPASS"
      }
    };
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
