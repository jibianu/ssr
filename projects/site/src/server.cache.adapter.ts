/**
 * Cache Adapter - Supports both NodeCache (in-memory) and Redis
 * 
 * Provides a unified interface for caching strategies
 */

import NodeCache from 'node-cache';
import { createClient } from 'redis';

export interface CacheAdapter {
  get: (key: string) => Promise<any> | any;
  set: (key: string, value: any, ttl?: number) => Promise<boolean> | boolean;
  del: (key: string) => Promise<number> | number;
  keys: () => Promise<string[]> | string[];
  flushAll: () => Promise<void> | void;
  getStats: () => {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  };
}

/**
 * Create in-memory cache adapter (NodeCache)
 */
export function createMemoryCache(config?: {
  stdTTL?: number;
  checkperiod?: number;
  maxKeys?: number;
}): CacheAdapter {
  const cache = new NodeCache({
    stdTTL: config?.stdTTL || 3600,
    checkperiod: config?.checkperiod || 600,
    maxKeys: config?.maxKeys || 1000,
    useClones: false
  });

  return {
    get: (key: string) => cache.get(key),
    set: (key: string, value: any, ttl?: number) => {
      if (ttl) {
        return cache.set(key, value, ttl);
      }
      return cache.set(key, value);
    },
    del: (key: string) => cache.del(key) ? 1 : 0,
    keys: () => cache.keys(),
    flushAll: () => cache.flushAll(),
    getStats: () => cache.getStats()
  };
}

/**
 * Create Redis cache adapter
 */
export function createRedisCache(redisUrl: string, keyPrefix: string = 'ssr:'): CacheAdapter {
  const client = createClient({ url: redisUrl });
  let isConnected = false;
  let connectionPromise: Promise<any> | null = null;

  // Track stats for Redis (since Redis doesn't provide stats API)
  let stats = {
    keys: 0,
    hits: 0,
    misses: 0,
    ksize: 0,
    vsize: 0
  };

  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
    isConnected = false;
  });

  client.on('connect', () => {
    console.log('✅ Redis connected');
    isConnected = true;
  });

  // Connect to Redis
  connectionPromise = client.connect().then(() => {
    isConnected = true;
    return client;
  }).catch((err) => {
    console.error('❌ Failed to connect to Redis:', err);
    console.warn('⚠️  Falling back to in-memory cache');
    isConnected = false;
    // Don't throw - allow cache operations to gracefully fail
    return null;
  });

  const getPrefixedKey = (key: string): string => {
    return key.startsWith(keyPrefix) ? key : `${keyPrefix}${key}`;
  };

  const removePrefix = (key: string): string => {
    return key.startsWith(keyPrefix) ? key.substring(keyPrefix.length) : key;
  };

  return {
    get: async (key: string): Promise<any> => {
      if (!isConnected) {
        stats.misses++;
        return undefined;
      }

      try {
        if (connectionPromise) {
          const connectionResult = await connectionPromise;
          if (!connectionResult) {
            // Connection failed
            stats.misses++;
            return undefined;
          }
        }
        const prefixedKey = getPrefixedKey(key);
        const value = await client.get(prefixedKey);

        if (value && typeof value === 'string') {
          stats.hits++;
          return JSON.parse(value);
        } else {
          stats.misses++;
          return undefined;
        }
      } catch (error) {
        console.warn('Redis GET error:', error);
        stats.misses++;
        return undefined;
      }
    },

    set: async (key: string, value: any, ttl?: number): Promise<boolean> => {
      if (!isConnected) {
        return false;
      }

      try {
        if (connectionPromise) {
          const connectionResult = await connectionPromise;
          if (!connectionResult) {
            // Connection failed
            return false;
          }
        }
        const prefixedKey = getPrefixedKey(key);
        const serialized = JSON.stringify(value);

        if (ttl) {
          await client.setEx(prefixedKey, ttl, serialized);
        } else {
          await client.set(prefixedKey, serialized);
        }

        // Update stats
        const dbSize = await client.dbSize();
        stats.keys = typeof dbSize === 'number' ? dbSize : parseInt(dbSize.toString(), 10) || 0;
        stats.vsize += serialized.length;

        return true;
      } catch (error) {
        console.warn('Redis SET error:', error);
        return false;
      }
    },

    del: async (key: string): Promise<number> => {
      if (!isConnected) {
        return 0;
      }

      try {
        if (connectionPromise) {
          const connectionResult = await connectionPromise;
          if (!connectionResult) {
            // Connection failed
            return 0;
          }
        }
        const prefixedKey = getPrefixedKey(key);
        const result = await client.del(prefixedKey);
        const dbSize = await client.dbSize();
        stats.keys = typeof dbSize === 'number' ? dbSize : parseInt(dbSize.toString(), 10) || 0;
        return typeof result === 'number' ? result : parseInt(result.toString(), 10) || 0;
      } catch (error) {
        console.warn('Redis DEL error:', error);
        return 0;
      }
    },

    keys: async (): Promise<string[]> => {
      if (!isConnected) {
        return [];
      }

      try {
        if (connectionPromise) {
          const connectionResult = await connectionPromise;
          if (!connectionResult) {
            // Connection failed
            return [];
          }
        }
        const keys = await client.keys(`${keyPrefix}*`);
        return keys.map(removePrefix);
      } catch (error) {
        console.warn('Redis KEYS error:', error);
        return [];
      }
    },

    flushAll: async (): Promise<void> => {
      if (!isConnected) {
        return;
      }

      try {
        if (connectionPromise) {
          const connectionResult = await connectionPromise;
          if (!connectionResult) {
            // Connection failed
            return;
          }
        }
        // Only flush keys with our prefix
        const keys = await client.keys(`${keyPrefix}*`);
        if (keys.length > 0) {
          await client.del(keys);
        }
        stats.keys = 0;
        stats.vsize = 0;
      } catch (error) {
        console.error('Redis FLUSH error:', error);
      }
    },

    getStats: (): { keys: number; hits: number; misses: number; ksize: number; vsize: number } => {
      // Try to get actual key count from Redis
      if (isConnected && client) {
        client.dbSize()
          .then(count => {
            stats.keys = typeof count === 'number' ? count : parseInt(count.toString(), 10) || 0;
          })
          .catch(() => {
            // Ignore errors updating stats
          });
      }

      const hitRate = stats.hits + stats.misses > 0 
        ? stats.hits / (stats.hits + stats.misses)
        : 0;

      return {
        keys: stats.keys,
        hits: stats.hits,
        misses: stats.misses,
        ksize: 0, // Key size not easily tracked in Redis
        vsize: stats.vsize
      };
    }
  };
}

/**
 * Create cache adapter based on configuration
 */
export function createCacheAdapter(config: {
  type: 'memory' | 'redis';
  redisUrl?: string;
  redisKeyPrefix?: string;
  memoryConfig?: {
    stdTTL?: number;
    checkperiod?: number;
    maxKeys?: number;
  };
}): CacheAdapter {
  if (config.type === 'redis' && config.redisUrl) {
    console.log('🔴 Initializing Redis cache...');
    return createRedisCache(config.redisUrl, config.redisKeyPrefix);
  } else {
    console.log('💾 Initializing in-memory cache...');
    return createMemoryCache(config.memoryConfig);
  }
}

