import { Redis } from "@upstash/redis";
import { getOptionalEnv } from "@/lib/server/env";

let redisClient: Redis | null | undefined;
let hasLoggedMissingConfig = false;

export function getRedisClient() {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = getOptionalEnv("UPSTASH_REDIS_REST_URL");
  const token = getOptionalEnv("UPSTASH_REDIS_REST_TOKEN");

  if (!url || !token) {
    if (!hasLoggedMissingConfig) {
      hasLoggedMissingConfig = true;
      console.warn("Upstash Redis env vars are missing. Falling back to direct API calls.");
    }
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({
    url,
    token
  });

  return redisClient;
}
