# Redis Caching Implementation Guide (Optional)

**Status**: Ready for Production Scaling  
**Use Case**: Multi-server deployments, high-traffic environments

---

## 🎯 WHEN TO USE REDIS

### **Use Redis When**:
- ✅ Multiple server instances (load balancing)
- ✅ Need cache persistence across restarts
- ✅ High-traffic production environment
- ✅ Need shared cache across servers

### **Use In-Memory When**:
- ✅ Single server deployment
- ✅ Development/staging environment
- ✅ Low to medium traffic

---

## 📦 INSTALLATION

```bash
pnpm add redis
```

---

## 🔧 IMPLEMENTATION

### **Option 1: Conditional Redis Support** (Recommended)

Update `src/server.ts` to support both memory and Redis:

```typescript
import NodeCache from 'node-cache';
import { createClient } from 'redis';

const USE_REDIS = process.env['USE_REDIS_CACHE'] === 'true';
const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';

// Initialize cache based on environment
let htmlCache: NodeCache | ReturnType<typeof createRedisCache>;

if (USE_REDIS) {
  console.log('🔴 Using Redis cache');
  htmlCache = createRedisCache(REDIS_URL);
} else {
  console.log('💾 Using in-memory cache');
  htmlCache = new NodeCache({
    stdTTL: 3600,
    checkperiod: 600,
    maxKeys: 1000,
    useClones: false
  });
}

// Redis cache wrapper
function createRedisCache(redisUrl: string) {
  const client = createClient({ url: redisUrl });
  let isConnected = false;

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
    isConnected = false;
  });

  client.on('connect', () => {
    console.log('✅ Redis connected');
    isConnected = true;
  });

  // Connect immediately
  client.connect().catch(console.error);

  // NodeCache-compatible interface
  return {
    get: async (key: string) => {
      if (!isConnected) return undefined;
      try {
        const value = await client.get(key);
        return value ? JSON.parse(value) : undefined;
      } catch {
        return undefined;
      }
    },
    set: async (key: string, value: any, ttl?: number) => {
      if (!isConnected) return false;
      try {
        const serialized = JSON.stringify(value);
        if (ttl) {
          await client.setEx(key, ttl, serialized);
        } else {
          await client.set(key, serialized);
        }
        return true;
      } catch {
        return false;
      }
    },
    del: async (key: string) => {
      if (!isConnected) return 0;
      try {
        return await client.del(key);
      } catch {
        return 0;
      }
    },
    keys: async () => {
      if (!isConnected) return [];
      try {
        return await client.keys('ssr:*');
      } catch {
        return [];
      }
    },
    flushAll: async () => {
      if (!isConnected) return;
      try {
        await client.flushDb();
      } catch (error) {
        console.error('Redis flush error:', error);
      }
    },
    getStats: () => {
      // Redis stats would require additional setup
      return {
        keys: 0,
        hits: 0,
        misses: 0,
        ksize: 0,
        vsize: 0
      };
    }
  };
}
```

### **Option 2: Environment-Based Configuration**

Use the cache config module:

```typescript
// server.ts
import { getCacheConfig, isStaticRoute } from './server.cache.config';

const cacheConfig = getCacheConfig();

if (cacheConfig.type === 'redis') {
  // Initialize Redis
} else {
  // Initialize NodeCache
}
```

---

## 🌍 ENVIRONMENT VARIABLES

```bash
# Enable Redis caching
USE_REDIS_CACHE=true

# Redis connection
REDIS_URL=redis://localhost:6379
# Or for Redis Cloud
REDIS_URL=redis://user:password@host:port

# Cache TTL
CACHE_TTL_STATIC=3600    # 1 hour
CACHE_TTL_DYNAMIC=60     # 1 minute

# Redis key prefix
REDIS_KEY_PREFIX=ssr:
```

---

## 🚀 DEPLOYMENT EXAMPLES

### **Docker Compose** (Development):

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  app:
    environment:
      - USE_REDIS_CACHE=true
      - REDIS_URL=redis://redis:6379
```

### **Production (AWS ElastiCache)**:

```bash
export USE_REDIS_CACHE=true
export REDIS_URL=redis://your-elasticache-cluster.cache.amazonaws.com:6379
```

### **Production (Redis Cloud)**:

```bash
export USE_REDIS_CACHE=true
export REDIS_URL=redis://default:password@redis-12345.cloud.redislabs.com:12345
```

---

## ✅ BENEFITS

### **In-Memory Cache**:
- ✅ Zero dependencies
- ✅ Fastest for single server
- ✅ Simple setup

### **Redis Cache**:
- ✅ Shared across servers
- ✅ Persistent across restarts
- ✅ Better for horizontal scaling
- ✅ Production-ready

---

**Status**: Optional implementation  
**Recommendation**: Use for production multi-server deployments

