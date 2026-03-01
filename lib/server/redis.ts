import { Redis } from "@upstash/redis";
import { getOptionalEnv } from "@/lib/server/env";
import { logServerWarn } from "@/lib/server/logger";

let redisClient: Redis | null | undefined;
let hasLoggedMissingConfig = false;

function looksLikePlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("your_") ||
    normalized.includes("placeholder") ||
    normalized.includes("replace_") ||
    normalized.includes("_here")
  );
}

export function getRedisClient() {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = getOptionalEnv("UPSTASH_REDIS_REST_URL");
  const token = getOptionalEnv("UPSTASH_REDIS_REST_TOKEN");

  const hasValidStrings = typeof url === "string" && typeof token === "string";
  const invalidUrl = hasValidStrings && !/^https:\/\//i.test(url);
  const placeholderValue =
    hasValidStrings && (looksLikePlaceholder(url) || looksLikePlaceholder(token));

  if (!hasValidStrings || invalidUrl || placeholderValue) {
    if (!hasLoggedMissingConfig) {
      hasLoggedMissingConfig = true;
      logServerWarn("Upstash Redis env vars are invalid or missing. Falling back to direct API calls.");
    }
    redisClient = null;
    return redisClient;
  }

  const validatedUrl = url;
  const validatedToken = token;

  try {
    redisClient = new Redis({
      url: validatedUrl,
      token: validatedToken
    });
  } catch (error) {
    if (!hasLoggedMissingConfig) {
      hasLoggedMissingConfig = true;
      logServerWarn("Failed to initialize Upstash Redis client. Falling back to direct API calls.", error);
    }
    redisClient = null;
  }

  return redisClient;
}
