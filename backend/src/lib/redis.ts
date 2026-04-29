import IORedis from "ioredis";

const url = process.env.REDIS_URL || "redis://localhost:6379";

// BullMQ requires maxRetriesPerRequest: null on all connections.
// Queue operations get a race-timeout at the call site (see routes/video.ts).
export const redisConnection = new IORedis(url, {
  maxRetriesPerRequest: null,
  connectTimeout: 5000,
});

// Separate connection for the Worker (long-lived blocking commands).
export const workerRedisConnection = new IORedis(url, {
  maxRetriesPerRequest: null,
  connectTimeout: 5000,
});

redisConnection.on("error", (err) => console.error("[Redis/queue]", err.message));
workerRedisConnection.on("error", (err) => console.error("[Redis/worker]", err.message));
