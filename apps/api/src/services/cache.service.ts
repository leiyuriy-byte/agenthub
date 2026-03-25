/**
 * Cache Service - In-memory caching for hot API endpoints
 * Uses node-cache for TTL-based cache management
 */

import NodeCache from 'node-cache';

// Default TTL: 5 minutes for most data
const DEFAULT_TTL = 300;
// Statistics TTL: 1 minute (more dynamic)
const STATS_TTL = 60;
// List data TTL: 2 minutes
const LIST_TTL = 120;

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  enabled?: boolean;
}

export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Cache service for API responses
 */
class CacheService {
  private cache: NodeCache;
  private stats = { hits: 0, misses: 0 };

  constructor() {
    // Standard TTL: 5 minutes, check every minute for expired keys
    this.cache = new NodeCache({ stdTTL: DEFAULT_TTL, checkperiod: 60 });
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return undefined;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): boolean {
    const { ttl = DEFAULT_TTL, enabled = true } = options;
    
    if (!enabled) return false;
    
    return this.cache.set(key, value, ttl);
  }

  /**
   * Delete key from cache
   */
  del(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Delete keys matching pattern
   */
  delPattern(pattern: string): number {
    const keys = this.cache.keys();
    const regex = new RegExp(pattern);
    let deletedCount = 0;
    
    for (const key of keys) {
      if (regex.test(key)) {
        deletedCount += this.cache.del(key);
      }
    }
    
    return deletedCount;
  }

  /**
   * Clear all cache
   */
  flush(): void {
    this.cache.flushAll();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const keys = this.cache.keys().length;
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      keys,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
    };
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get TTL for a key
   */
  getTTL(key: string): number {
    return this.cache.getTtl(key) || 0;
  }

  /**
   * Pre-warm cache with data
   */
  async warm<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, options);
    return data;
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache key generators
export const cacheKeys = {
  // Agents
  agentsList: (filters?: string) => `agents:list:${filters || 'all'}`,
  agentDetail: (id: string) => `agent:${id}`,
  featuredAgents: () => 'agents:featured',
  popularAgents: (period: '7d' | '30d' | 'all') => `agents:popular:${period}`,
  agentCategories: () => 'agents:categories',

  // Posts/Discussions
  postsList: (filters?: string) => `posts:list:${filters || 'all'}`,
  postDetail: (id: string) => `post:${id}`,
  channelPosts: (channelId: string) => `posts:channel:${channelId}`,

  // Statistics
  homeStats: () => 'stats:home',
  overviewStats: () => 'stats:overview',

  // Channels
  channels: () => 'channels:all',

  // Users
  userProfile: (id: string) => `user:${id}`,
  userAgents: (userId: string) => `user:${userId}:agents`,
  userPosts: (userId: string) => `user:${userId}:posts`,

  // Leaderboard
  leaderboard: (period: 'weekly' | 'monthly' | 'total') => `leaderboard:${period}`,
};

// Cache durations
export const cacheDurations = {
  DEFAULT: DEFAULT_TTL,
  STATS: STATS_TTL,
  LIST: LIST_TTL,
  SHORT: 60, // 1 minute
  MEDIUM: 120, // 2 minutes
  LONG: 300, // 5 minutes
  VERY_LONG: 600, // 10 minutes
};

export default cacheService;
