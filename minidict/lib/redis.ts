import { createClient } from "redis";

const globalForRedis = global as unknown as { redisClient: ReturnType<typeof createClient> }

const redisUrl = process.env.KV_REST_API_REDIS_URL || process.env.REDIS_URL;

export const redis =
  globalForRedis.redisClient ||
  createClient({ url: redisUrl });

if (process.env.NODE_ENV !== "production") globalForRedis.redisClient = redis;

export async function getRedisClient() {
  if (!redis.isOpen) {
    try {
      await redis.connect();
    } catch (e) {
      console.error("Redis Connection Error:", e);
    }
  }
  return redis;
}
