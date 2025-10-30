/**
 * CDN Cache Headers Middleware
 * 
 * Enhances HTTP response headers for optimal CDN caching.
 * Supports multiple CDN providers (Cloudflare, AWS CloudFront, Fastly).
 * 
 * Usage:
 *   app.use(cdnCacheMiddleware);
 */

import { Request, Response, NextFunction } from 'express';
import { isStaticRoute as checkStaticRoute } from './server.cache.config';

/**
 * CDN Cache Middleware
 * Adds CDN-specific headers for optimal edge caching
 */
export function cdnCacheMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const path = req.path;
  const isStatic = checkStaticRoute(path);

  // ✅ CDN: Surrogate-Control header (for CDN-specific TTL)
  // Used by Cloudflare, Fastly, and other CDNs
  if (isStatic) {
    // Static routes: Cache at edge for 24 hours, allow stale for 7 days while revalidating
    res.setHeader('Surrogate-Control', 'max-age=86400, stale-while-revalidate=604800');
  } else {
    // Dynamic routes: Cache at edge for 5 minutes, allow stale for 1 hour while revalidating
    res.setHeader('Surrogate-Control', 'max-age=300, stale-while-revalidate=3600');
  }

  // ✅ CDN: Edge-Cache-Tag for selective purging (Cloudflare, Fastly)
  // Allows purging specific pages via tag
  const tag = getCacheTag(path);
  res.setHeader('Edge-Cache-Tag', tag);

  // ✅ CDN: CDN-Cache-Control (alternative header used by some CDNs)
  if (isStatic) {
    res.setHeader('CDN-Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  } else {
    res.setHeader('CDN-Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }

  // ✅ CDN: X-Cache-Key for debugging
  // Helps identify cache keys in CDN logs
  const cacheKey = generateCacheKey(req);
  res.setHeader('X-Cache-Key', cacheKey);

  // ✅ CDN: Cache-Tags header (for some CDN providers)
  res.setHeader('Cache-Tags', tag);

  next();
}

/**
 * Generate cache tag from path
 * Examples:
 *   '/' → 'page:home'
 *   '/about-us' → 'page:about-us'
 *   '/course/api-510' → 'page:course'
 */
function getCacheTag(path: string): string {
  // Remove leading/trailing slashes and get first segment
  const segments = path.split('/').filter(Boolean);
  const pageTag = segments.length > 0 ? segments[0] : 'home';
  return `page:${pageTag}`;
}

/**
 * Generate cache key for debugging
 */
function generateCacheKey(req: Request): string {
  const path = req.path;
  const queryString = Object.keys(req.query).length > 0 
    ? '?' + new URLSearchParams(req.query as Record<string, string>).toString()
    : '';
  const authPart = req.headers.authorization ? ':auth' : ':guest';
  return `${path}${queryString}${authPart}`;
}

/**
 * Purge cache for specific tag (helper function)
 * 
 * This function can be called from cache invalidation endpoint
 * to purge CDN cache via their APIs
 */
export async function purgeCDNCache(
  tag: string,
  cdnProvider: 'cloudflare' | 'cloudfront' | 'fastly' = 'cloudflare'
): Promise<boolean> {
  const cdnEnabled = process.env['CDN_ENABLED'] === 'true';
  if (!cdnEnabled) {
    return false;
  }

  try {
    switch (cdnProvider) {
      case 'cloudflare':
        return await purgeCloudflareCache(tag);
      case 'cloudfront':
        return await purgeCloudFrontCache(tag);
      case 'fastly':
        return await purgeFastlyCache(tag);
      default:
        console.warn(`Unknown CDN provider: ${cdnProvider}`);
        return false;
    }
  } catch (error) {
    console.error(`Failed to purge CDN cache for tag ${tag}:`, error);
    return false;
  }
}

/**
 * Purge Cloudflare cache via API
 */
async function purgeCloudflareCache(tag: string): Promise<boolean> {
  const zoneId = process.env['CLOUDFLARE_ZONE_ID'];
  const apiToken = process.env['CLOUDFLARE_API_TOKEN'];

  if (!zoneId || !apiToken) {
    console.warn('Cloudflare credentials not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tags: [tag]
        })
      }
    );

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Cloudflare cache purge error:', error);
    return false;
  }
}

/**
 * Purge AWS CloudFront cache via API
 */
async function purgeCloudFrontCache(tag: string): Promise<boolean> {
  // CloudFront doesn't support tag-based purging
  // Need to invalidate by path pattern instead
  console.warn('CloudFront tag-based purging not supported. Use path-based invalidation.');
  return false;
}

/**
 * Purge Fastly cache via API
 */
async function purgeFastlyCache(tag: string): Promise<boolean> {
  const serviceId = process.env['FASTLY_SERVICE_ID'];
  const apiToken = process.env['FASTLY_API_TOKEN'];

  if (!serviceId || !apiToken) {
    console.warn('Fastly credentials not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.fastly.com/service/${serviceId}/purge/${tag}`,
      {
        method: 'POST',
        headers: {
          'Fastly-Key': apiToken,
          'Accept': 'application/json'
        }
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Fastly cache purge error:', error);
    return false;
  }
}

