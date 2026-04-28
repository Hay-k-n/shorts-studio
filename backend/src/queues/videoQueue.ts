import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis";

export const videoQueue = new Queue("video", { connection: redisConnection });
