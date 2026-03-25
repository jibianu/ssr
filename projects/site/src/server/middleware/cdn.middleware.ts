/**
 * CDN-oriented headers (Surrogate-Control, cache tags, debug key).
 * Relies on `isStaticRoute` from cache config for TTL tiers.
 */

import type { Request, Response, NextFunction } from 'express';
import { isStaticRoute as checkStaticRoute } from '../../server.cache.config';

export function cdnCacheMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;
  const isStatic = checkStaticRoute(path);

  if (isStatic) {
    res.setHeader('Surrogate-Control', 'max-age=86400, stale-while-revalidate=604800');
  } else {
    res.setHeader('Surrogate-Control', 'max-age=300, stale-while-revalidate=3600');
  }

  const tag = getCacheTag(path);
  res.setHeader('Edge-Cache-Tag', tag);

  if (isStatic) {
    res.setHeader('CDN-Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  } else {
    res.setHeader('CDN-Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }

  res.setHeader('X-Cache-Key', generateCacheKey(req));
  res.setHeader('Cache-Tags', tag);

  next();
}

function getCacheTag(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const pageTag = segments.length > 0 ? segments[0] : 'home';
  return `page:${pageTag}`;
}

function generateCacheKey(req: Request): string {
  const path = req.path;
  const queryString =
    Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query as Record<string, string>).toString() : '';
  const authPart = req.headers.authorization ? ':auth' : ':guest';
  return `${path}${queryString}${authPart}`;
}

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

async function purgeCloudflareCache(tag: string): Promise<boolean> {
  const zoneId = process.env['CLOUDFLARE_ZONE_ID'];
  const apiToken = process.env['CLOUDFLARE_API_TOKEN'];

  if (!zoneId || !apiToken) {
    console.warn('Cloudflare credentials not configured');
    return false;
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags: [tag] }),
    });

    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error('Cloudflare cache purge error:', error);
    return false;
  }
}

async function purgeCloudFrontCache(_tag: string): Promise<boolean> {
  console.warn('CloudFront tag-based purging not supported. Use path-based invalidation.');
  return false;
}

async function purgeFastlyCache(tag: string): Promise<boolean> {
  const serviceId = process.env['FASTLY_SERVICE_ID'];
  const apiToken = process.env['FASTLY_API_TOKEN'];

  if (!serviceId || !apiToken) {
    console.warn('Fastly credentials not configured');
    return false;
  }

  try {
    const response = await fetch(`https://api.fastly.com/service/${serviceId}/purge/${tag}`, {
      method: 'POST',
      headers: {
        'Fastly-Key': apiToken,
        Accept: 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Fastly cache purge error:', error);
    return false;
  }
}
