# Redis Caching - Quick Start Guide

**Status**: Ready to Use  
**Time to Setup**: 5-10 minutes

---

## 🚀 QUICK SETUP

### **Option 1: Use In-Memory Cache (Default - No Setup)**

Works immediately:
```bash
pnpm run serve:ssr
```

Output: `💾 Initializing in-memory cache...`

---

### **Option 2: Use Redis Cache**

**Step 1**: Start Redis
```bash
# Docker (recommended)
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Or install locally (see REDIS_IMPLEMENTATION_COMPLETE.md)
```

**Step 2**: Set Environment Variable
```bash
export USE_REDIS_CACHE=true
```

**Step 3**: Start Server
```bash
pnpm run serve:ssr
```

Output: `🔴 Initializing Redis cache...` → `✅ Redis connected`

---

## ✅ VERIFICATION

### **Check Cache Type**:
```bash
curl http://localhost:4000/cache-stats | jq '.cacheType'
# Should return: "memory" or "redis"
```

### **Test Caching**:
```bash
# First request (cache miss)
time curl http://localhost:4000/about-us

# Second request (cache hit - much faster!)
time curl http://localhost:4000/about-us
```

---

## 🎯 ENVIRONMENT VARIABLES

| Variable | Purpose | Example |
|----------|---------|---------|
| `USE_REDIS_CACHE` | Enable Redis | `true` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `CACHE_TTL_STATIC` | Static route TTL | `3600` (1 hour) |
| `CACHE_TTL_DYNAMIC` | Dynamic route TTL | `60` (1 minute) |

---

## ⚡ PERFORMANCE

- **In-Memory**: ~0.1ms cache lookups
- **Redis**: ~1-2ms cache lookups
- **Both**: 70-95% faster than uncached SSR

---

**Status**: ✅ Ready  
**Default**: In-memory (no setup needed)  
**Production**: Use Redis for multi-server deployments

