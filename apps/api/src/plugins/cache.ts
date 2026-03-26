import fp from 'fastify-plugin';
import NodeCache from 'node-cache';
import { FastifyInstance } from 'fastify';

// Cache configuration
const DEFAULT_TTL = 300; // 5 minutes
const STATS_TTL = 60; // 1 minute for stats
const LIST_TTL = 180; // 3 minutes for lists

export interface CachePluginOptions {
  /**
   * Default TTL in seconds
   */
  defaultTtl?: number;
  /**
   * Check period for expired keys (in seconds)
   */
  checkPeriod?: number;
}

// Cache statistics type (compatible with node-cache)
export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    cache: {
      /**
       * Get value from cache
       */
      get<T>(key: string): T | undefined;
      /**
       * Set value in cache
       */
      set<T>(key: string, value: T, ttl?: number): boolean;
      /**
       * Delete key from cache
       */
      del(key: string): number;
      /**
       * Check if key exists
       */
      has(key: string): boolean;
      /**
       * Clear all cache
       */
      flushAll(): void;
      /**
       * Get cache statistics
       */
      getStats(): CacheStats;
      /**
       * Delete keys matching pattern
       */
      delPattern(pattern: string): number;
    };
  }
}

async function cachePlugin(fastify: FastifyInstance, opts: CachePluginOptions) {
  const { defaultTtl = DEFAULT_TTL, checkPeriod = 600 } = opts;

  const cache = new NodeCache({
    stdTTL: defaultTtl,
    checkperiod: checkPeriod,
    useClones: false, // Disable cloning for performance
  });

  const cacheWrapper = {
    get<T>(key: string): T | undefined {
      try {
        return cache.get<T>(key);
      } catch (error) {
        fastify.log.error({ err: error }, 'Cache get error');
        return undefined;
      }
    },

    set<T>(key: string, value: T, ttl?: number): boolean {
      try {
        return cache.set(key, value, ttl ?? defaultTtl);
      } catch (error) {
        fastify.log.error({ err: error }, 'Cache set error');
        return false;
      }
    },

    del(key: string): number {
      try {
        return cache.del(key);
      } catch (error) {
        fastify.log.error({ err: error }, 'Cache delete error');
        return 0;
      }
    },

    has(key: string): boolean {
      try {
        return cache.has(key);
      } catch (error) {
        fastify.log.error({ err: error }, 'Cache has error');
        return false;
      }
    },

    flushAll(): void {
      try {
        cache.flushAll();
      } catch (error) {
        fastify.log.error({ err: error }, 'Cache flush error');
      }
    },

    getStats(): CacheStats {
      try {
        const stats = cache.getStats();
        return {
          keys: stats.keys,
          hits: stats.hits,
          misses: stats.misses,
          ksize: stats.ksize,
          vsize: stats.vsize,
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Cache stats error');
        return { keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 };
      }
    },

    delPattern(pattern: string): number {
      try {
        const keys = cache.keys();
        const regex = new RegExp(pattern);
        let deleted = 0;
        for (const key of keys) {
          if (regex.test(key)) {
            cache.del(key);
            deleted++;
          }
        }
        return deleted;
      } catch (error) {
        fastify.log.error({ err: error, pattern }, 'Cache delPattern error');
        return 0;
      }
    },
  };

  // Expose cache methods
  fastify.decorate('cache', cacheWrapper);

  // Log cache stats periodically
  const statsInterval = setInterval(() => {
    const stats = cache.getStats();
    fastify.log.debug(
      { stats },
      'Cache statistics'
    );
  }, 60000);

  fastify.addHook('onClose', () => {
    clearInterval(statsInterval);
    cache.flushAll();
  });

  fastify.log.info(
    { defaultTtl, checkPeriod },
    'Cache plugin initialized'
  );
}

// Export cache TTL constants for use in routes
export const CACHE_TTL = {
  STATS: STATS_TTL,
  LIST: LIST_TTL,
  DEFAULT: DEFAULT_TTL,
  // Agent-specific TTLs
  AGENT_LIST: LIST_TTL,
  AGENT_DETAIL: 300, // 5 minutes
  AGENT_STATS: STATS_TTL,
  // Post-specific TTLs
  POST_LIST: LIST_TTL,
  POST_DETAIL: 180,
  // User-specific TTLs
  USER_PROFILE: 300,
  // Channel/Category (rarely changes)
  CHANNELS: 3600, // 1 hour
  CATEGORIES: 3600,
} as const;

export default fp(cachePlugin, {
  name: 'cache',
  fastify: '4.x',
});
