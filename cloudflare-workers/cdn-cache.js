/**
 * Cloudflare Worker for CDN Caching
 * 
 * Deploy this to Cloudflare Workers for edge caching of Angular SSR responses.
 * 
 * Setup:
 * 1. Create a Cloudflare Worker
 * 2. Paste this code
 * 3. Add route: your-domain.com/*
 * 4. Enable "Cache Everything" for static routes
 * 
 * Benefits:
 * - 80-95% of traffic served from edge (5-50ms response)
 * - Automatic DDoS protection
 * - Global distribution
 * - Free tier: 100GB/month
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Handle incoming requests
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Static routes - aggressive caching
  const staticRoutes = [
    '/',
    '/about-us',
    '/contact-us',
    '/terms-and-conditions',
    '/privacy-policy',
    '/refund-cancellation-policy',
    '/mission-and-vision',
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
    '/worlds-largest-refineries',
    '/in-house-solutions',
    '/policies',
    '/page-not-found'
  ];
  
  const isStatic = staticRoutes.includes(path);
  
  // Skip caching for authenticated routes and API endpoints
  if (isAuthenticatedRoute(path) || isApiRoute(path)) {
    return fetch(request);
  }
  
  // Create cache key
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;
  
  if (isStatic) {
    // ✅ STATIC ROUTES: Aggressive caching at edge
    
    // Check cache first
    let response = await cache.match(cacheKey);
    
    if (response) {
      // Cache hit - serve from edge
      return response;
    }
    
    // Cache miss - fetch from origin
    response = await fetch(request);
    
    // Clone response to cache
    const responseToCache = response.clone();
    
    // Set cache headers
    responseToCache.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    responseToCache.headers.set('Edge-Cache-Tag', `page:${path.split('/')[1] || 'home'}`);
    responseToCache.headers.set('Surrogate-Control', 'max-age=86400, stale-while-revalidate=604800');
    
    // Store in cache (non-blocking)
    event.waitUntil(cache.put(cacheKey, responseToCache));
    
    return response;
  } else {
    // ✅ DYNAMIC ROUTES: Shorter cache with stale-while-revalidate
    
    // Check cache first
    let response = await cache.match(cacheKey);
    
    if (response) {
      // Cache hit - serve from edge
      return response;
    }
    
    // Cache miss - fetch from origin
    response = await fetch(request);
    
    // Clone response to cache
    const responseToCache = response.clone();
    
    // Set cache headers (shorter TTL for dynamic content)
    responseToCache.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    responseToCache.headers.set('Edge-Cache-Tag', `page:${path.split('/')[1] || 'home'}`);
    responseToCache.headers.set('Surrogate-Control', 'max-age=300, stale-while-revalidate=3600');
    
    // Store in cache (non-blocking)
    event.waitUntil(cache.put(cacheKey, responseToCache));
    
    return response;
  }
}

/**
 * Check if route requires authentication
 */
function isAuthenticatedRoute(path) {
  const authRoutes = ['/app', '/auth/login', '/auth/register'];
  return authRoutes.some(route => path.startsWith(route));
}

/**
 * Check if route is API endpoint
 */
function isApiRoute(path) {
  return path.startsWith('/api/') || path.startsWith('/auth/api/');
}

