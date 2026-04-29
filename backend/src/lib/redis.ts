import IORedis from "ioredis";

const url = process.env.REDIS_URL || "redis://localhost:6379";

// Used by Queue (API service): times out fast so requests fail with a clear
// error instead of hanging when Redis is slow or unreachable.
export const redisConnection = new IORedis(url, {
  maxRetriesPerRequest: null,
  connectTimeout: 5000,
  commandTimeout: 8000,
});

// Used by Worker: needs long-lived blocking commands (no command timeout).
export const workerRedisConnection = new IORedis(url, {
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) => {
  console.error("[Redis/queue]", err.message);
});
workerRedisConnection.on("error", (err) => {
  console.error("[Redis/worker]", err.message);
});
