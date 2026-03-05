/**
 * BullMQ connection options — parsed from REDIS_URL so we don't need to
 * import ioredis directly (which would clash with BullMQ's bundled version).
 *
 * Pass `redisConnection` as `connection:` to every Queue / Worker / QueueEvents.
 */

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return {
    host:                 u.hostname,
    port:                 parseInt(u.port || '6379', 10),
    username:             u.username || undefined,
    password:             u.password || undefined,
    // rediss:// = TLS required (Upstash)
    tls:                  u.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
    // Required by BullMQ
    maxRetriesPerRequest: null as null,
    enableReadyCheck:     false,
  };
}

export const redisConnection = parseRedisUrl(process.env.REDIS_URL!);
