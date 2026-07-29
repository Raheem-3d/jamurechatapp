// lib/redis.ts
let redisClient: any = null;
let pubClient: any = null;
let subClient: any = null;
let redisConnected = false;
let fallbackLogged = false;

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

function safeRequire(moduleName: string) {
  try {
    const req = eval("require");
    return req(moduleName);
  } catch (e) {
    return null;
  }
}

export function initRedis() {
  if (redisClient) return { redisClient, pubClient, subClient, isConnected: redisConnected };

  try {
    const Redis = safeRequire("ioredis");
    if (!Redis) {
      if (!fallbackLogged) {
        console.log("> [Redis] ioredis module not installed. Operating in fallback mode.");
        fallbackLogged = true;
      }
      return { redisClient: null, pubClient: null, subClient: null, isConnected: false };
    }

    const clientOpts = {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      retryStrategy(times: number) {
        if (times > 3) {
          return null;
        }
        return 1000;
      },
    };

    redisClient = new Redis(REDIS_URL, clientOpts);
    pubClient = new Redis(REDIS_URL, clientOpts);
    subClient = pubClient.duplicate();

    redisClient.on("connect", () => {
      redisConnected = true;
      console.log(`> [Redis] Connected successfully to ${REDIS_URL}`);
    });

    redisClient.on("error", (err: any) => {
      if (redisConnected) {
        console.warn(`> [Redis] Disconnected: ${err.message}. Operating in fallback mode.`);
      }
      redisConnected = false;
    });

    pubClient.on("error", () => { redisConnected = false; });
    subClient.on("error", () => { redisConnected = false; });

  } catch (error) {
    if (!fallbackLogged) {
      console.log("> [Redis] ioredis connection unavailable. Using in-memory fallback.");
      fallbackLogged = true;
    }
    redisConnected = false;
  }

  return { redisClient, pubClient, subClient, isConnected: redisConnected };
}

export function isRedisConnected(): boolean {
  return redisConnected;
}

export function getRedisClient(): any {
  if (!redisClient && !fallbackLogged) initRedis();
  return redisClient;
}

export function getRedisPubSub() {
  if ((!pubClient || !subClient) && !fallbackLogged) initRedis();
  return { pubClient, subClient };
}

// === Generic Redis JSON Cache Helpers ===

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    if (client && redisConnected) {
      const data = await client.get(key);
      if (data) return JSON.parse(data) as T;
    }
  } catch (e) {
    // Non-fatal fallback
  }
  return null;
}

export async function cacheSet(key: string, value: any, ttlSeconds = 300): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (client && redisConnected) {
      await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return true;
    }
  } catch (e) {
    // Non-fatal fallback
  }
  return false;
}

export async function cacheDel(key: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (client && redisConnected) {
      await client.del(key);
      return true;
    }
  } catch (e) {
    // Non-fatal fallback
  }
  return false;
}

export async function pushCacheList(key: string, item: any, maxLen = 100): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (client && redisConnected) {
      const pipeline = client.pipeline();
      pipeline.lpush(key, JSON.stringify(item));
      pipeline.ltrim(key, 0, maxLen - 1);
      pipeline.expire(key, 86400); // 24h TTL
      await pipeline.exec();
      return true;
    }
  } catch (e) {
    // Non-fatal fallback
  }
  return false;
}

export async function getCacheList<T = any>(key: string, start = 0, stop = 99): Promise<T[] | null> {
  try {
    const client = getRedisClient();
    if (client && redisConnected) {
      const rawList = await client.lrange(key, start, stop);
      if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList.map((item: string) => JSON.parse(item)) as T[];
      }
    }
  } catch (e) {
    // Non-fatal fallback
  }
  return null;
}
