# Caching Integration Guide - Angular 20 SSR

**Complete setup guide for multi-layer caching** (In-Memory → Redis → CDN)

---

## 🎯 **QUICK START**

### **1. In-Memory + Redis Caching** (Already Configured ✅)

Your server already has in-memory and Redis caching configured!

**Enable Redis**:
```bash
# .env
USE_REDIS_CACHE=true
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=ssr:
```

**Start Redis**:
```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or install locally
# macOS: brew install redis
# Ubuntu: sudo apt-get install redis-server
# Windows: Download from https://redis.io/download
```

---

### **2. CDN Setup** (Cloudflare - Recommended)

#### **Step 1: Sign up for Cloudflare**
1. Go to https://cloudflare.com
2. Sign up for free account
3. Add your domain

#### **Step 2: Configure DNS**
1. Cloudflare will provide nameservers
2. Update your domain registrar with Cloudflare nameservers
3. Wait for DNS propagation (15-30 minutes)

#### **Step 3: Enable Caching**
1. Go to Cloudflare Dashboard → Caching → Configuration
2. Set **Caching Level**: Standard
3. Enable **Browser Cache TTL**: Respect Existing Headers
4. Enable **Always Online**: Yes

#### **Step 4: Set Page Rules** (Optional - for granular control)

```
Rule 1: Static Pages
URL Pattern: your-domain.com/about-us|contact-us|privacy-policy|terms-and-conditions
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 4 hours
  - Browser Cache TTL: 4 hours

Rule 2: Dynamic Pages
URL Pattern: your-domain.com/course/*
Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 1 hour
  - Browser Cache TTL: 1 hour
```

#### **Step 5: Deploy Cloudflare Worker** (Optional - Advanced)

1. Go to Workers & Pages → Create a Worker
2. Paste code from `cloudflare-workers/cdn-cache.js`
3. Add route: `your-domain.com/*`
4. Save and Deploy

---

## 🔧 **NODE.JS MIDDLEWARE INTEGRATION**

### **Current Setup** (Already Integrated ✅)

The CDN middleware is already integrated in `src/server.ts`:

```typescript
// ✅ CDN: Add CDN cache headers middleware before SSR
app.use(cdnCacheMiddleware);
```

### **Enhanced Cache Invalidation**

The cache invalidation endpoint now supports CDN purging:

```bash
# Invalidate cache + purge CDN
curl -X POST http://localhost:4000/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "/course/api-510",
    "purgeCDN": true
  }'
```

---

## 📊 **ENVIRONMENT VARIABLES**

### **Required Configuration**

```bash
# .env

# Redis Configuration
USE_REDIS_CACHE=true
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=ssr:

# CDN Configuration
CDN_ENABLED=true
CDN_TYPE=cloudflare  # or cloudfront, fastly

# Cloudflare (if using Workers or API)
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_API_TOKEN=your-api-token

# Cache TTLs
CACHE_TTL_STATIC=86400    # 24 hours
CACHE_TTL_DYNAMIC=300     # 5 minutes

# In-Memory Cache Limits
CACHE_MAX_KEYS=5000
CACHE_CHECK_PERIOD=600     # 10 minutes
```

---

## 🧪 **TESTING CACHE LAYERS**

### **Test In-Memory Cache**

```bash
# First request (cache miss)
curl -I http://localhost:4000/about-us
# Should see: X-Cache: MISS

# Second request (cache hit)
curl -I http://localhost:4000/about-us
# Should see: X-Cache: HIT
```

### **Test Redis Cache**

```bash
# Check Redis connection
redis-cli ping
# Should return: PONG

# Check cache keys
redis-cli keys "ssr:*"

# Check cache stats
curl http://localhost:4000/cache-stats
```

### **Test CDN Cache**

```bash
# Check CDN headers
curl -I https://your-domain.com/about-us

# Should see:
# CF-Cache-Status: HIT (Cloudflare)
# Edge-Cache-Tag: page:about-us
# Surrogate-Control: max-age=86400
```

---

## 📈 **MONITORING**

### **Cache Stats Endpoint**

```bash
curl http://localhost:4000/cache-stats

# Response:
{
  "cacheType": "redis",
  "keys": 1245,
  "hits": 8923,
  "misses": 456,
  "hitRate": "95.14%",
  "ksize": "15.23 KB",
  "vsize": "245.67 MB",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Performance Stats**

```bash
curl http://localhost:4000/performance-stats?minutes=60

# Shows:
# - Average render time
# - Cache hit rate
# - Request count
# - System metrics
```

---

## 🔄 **CACHE INVALIDATION**

### **Invalidate by Pattern**

```bash
# Invalidate all course pages
curl -X POST http://localhost:4000/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"pattern": "/course"}'

# Invalidate specific route
curl -X POST http://localhost:4000/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"pattern": "/about-us"}'

# Invalidate + purge CDN
curl -X POST http://localhost:4000/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "/course/api-510",
    "purgeCDN": true
  }'
```

### **Clear All Cache**

```bash
curl -X POST http://localhost:4000/cache/clear
```

---

## 🚀 **PRODUCTION DEPLOYMENT**

### **Docker Compose Example**

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - USE_REDIS_CACHE=true
      - REDIS_URL=redis://redis:6379
      - CDN_ENABLED=true
      - CDN_TYPE=cloudflare
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### **Kubernetes Example**

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: angular-ssr
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: your-registry/angular-ssr:latest
        env:
        - name: USE_REDIS_CACHE
          value: "true"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
spec:
  type: ClusterIP
  ports:
  - port: 6379
```

---

## ✅ **VERIFICATION CHECKLIST**

### **In-Memory Cache**
- [ ] Server starts without errors
- [ ] Cache stats endpoint works (`/cache-stats`)
- [ ] Cache hit rate > 40%

### **Redis Cache**
- [ ] Redis server running
- [ ] Connection successful (check logs)
- [ ] Cache keys visible in Redis
- [ ] Cache hit rate > 80%

### **CDN Cache**
- [ ] Domain configured in Cloudflare
- [ ] SSL certificate active
- [ ] Cache headers present (check response headers)
- [ ] CDN hit rate > 80% (check Cloudflare Analytics)

---

## 🐛 **TROUBLESHOOTING**

### **Issue: Redis Connection Failed**

```bash
# Check Redis is running
redis-cli ping

# Check connection string
echo $REDIS_URL

# Test connection
redis-cli -u $REDIS_URL ping
```

### **Issue: Low Cache Hit Rate**

1. Check cache TTLs (too short?)
2. Verify cache keys are consistent
3. Check if routes are being invalidated too frequently
4. Monitor cache size (might be hitting max keys)

### **Issue: CDN Not Caching**

1. Verify Cloudflare is active (orange cloud icon)
2. Check page rules are configured
3. Verify cache headers are being sent
4. Check Cloudflare cache status in response headers

---

## 📚 **ADDITIONAL RESOURCES**

- [Redis Documentation](https://redis.io/docs/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [AWS CloudFront Docs](https://docs.aws.amazon.com/cloudfront/)
- `CACHING_STRATEGY_COMPLETE.md` - Complete strategy guide
- `src/server.ts` - Main server implementation
- `src/server.cache.adapter.ts` - Cache adapter code

---

**Status**: ✅ All middleware integrated and ready for production use

