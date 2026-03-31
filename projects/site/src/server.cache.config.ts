/**
 * Cache Configuration Module
 * 
 * Provides cache configuration options for different environments.
 * Supports in-memory (NodeCache) and Redis caching strategies.
 */

export interface CacheConfig {
  enabled: boolean;
  type: 'memory' | 'redis';
  ttl: {
    static: number;    // TTL for static routes (seconds)
    dynamic: number;  // TTL for dynamic routes (seconds)
  };
  redis?: {
    url: string;
    keyPrefix: string;
  };
  memory?: {
    maxKeys: number;
    checkperiod: number;
  };
}

/**
 * Get cache configuration from environment variables
 */
export function getCacheConfig(): CacheConfig {
  const useRedis = process.env['USE_REDIS_CACHE'] === 'true';
  const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';

  return {
    enabled: true,
    type: useRedis ? 'redis' : 'memory',  // Allow Redis in any environment if explicitly enabled
    ttl: {
      // ✅ OPTIMIZED: Increased TTL for better cache hit rates
      // Static routes: 24 hours (can be longer as content rarely changes)
      static: parseInt(process.env['CACHE_TTL_STATIC'] || '86400', 10),    // 24 hours (was: 3600)
      // Dynamic HTML: default 10 minutes (override with CACHE_TTL_DYNAMIC)
      dynamic: parseInt(process.env['CACHE_TTL_DYNAMIC'] || '600', 10)
    },
    redis: {
      url: redisUrl,
      keyPrefix: process.env['REDIS_KEY_PREFIX'] || 'ssr:'
    },
    memory: {
      // ✅ OPTIMIZED: Increased max keys to cache more routes
      maxKeys: parseInt(process.env['CACHE_MAX_KEYS'] || '5000', 10),    // 5000 routes (was: 1000)
      checkperiod: parseInt(process.env['CACHE_CHECK_PERIOD'] || '600', 10) // 10 minutes
    }
  };
}

/**
 * Static routes that should be cached aggressively
 */
export const STATIC_ROUTES = [
  '/',
  '/page-not-found',
  '/about-us',
  '/contact-us',
  '/mission-and-vision',
  '/terms-and-conditions',
  '/privacy-policy',
  '/refund-cancellation-policy',
  '/why-oilandgasclub',
  '/build-your-portfolio',
  '/courses-offered',
  '/corporate-training',
  '/guest-blogging',
  '/become-our-trainer',
  '/partner-us',
  '/career',
  '/membership',
  '/affiliate-program',
  '/in-house-solutions',
  '/policies'
];

/**
 * Check if a route is static (should be cached longer)
 */
export function isStaticRoute(path: string): boolean {
  return STATIC_ROUTES.includes(path) || path === '/';
}

