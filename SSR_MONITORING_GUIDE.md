# SSR Performance Monitoring & Profiling Guide

**Date**: Comprehensive Monitoring Implementation  
**Status**: ✅ Fully Implemented

---

## 📊 OVERVIEW

This guide covers all tools and methods for monitoring SSR performance, including:
- ✅ Node.js Performance Hooks (integrated)
- ✅ Angular DevTools
- ✅ Chrome Lighthouse SSR mode
- ✅ Custom performance endpoints
- ✅ Logging and metrics

---

## 🛠️ IMPLEMENTED TOOLS

### 1. **Performance Monitor (server.performance.ts)** ✅

**Location**: `src/server.performance.ts`

**Features**:
- Render time measurement
- Cache lookup time tracking
- Memory usage before/after rendering
- Request metrics aggregation
- Statistical analysis (avg, p95, p99)

**Usage**: Automatically integrated into `server.ts`

---

### 2. **Performance Endpoints** ✅

#### **GET `/performance-stats`**

Returns aggregated performance statistics.

**Query Parameters**:
- `minutes` (optional): Time range in minutes (default: 60)

**Response**:
```json
{
  "performance": {
    "totalRequests": 1250,
    "cacheHits": 980,
    "cacheMisses": 270,
    "avgRenderTime": 245.5,
    "avgTotalTime": 312.8,
    "p95RenderTime": 485.2,
    "p99RenderTime": 782.1,
    "p95TotalTime": 625.3,
    "p99TotalTime": 950.7,
    "avgMemoryDelta": 1250000,
    "maxMemoryDelta": 5200000,
    "errors": 0,
    "timeRange": {
      "start": 1234567890000,
      "end": 1234571490000
    }
  },
  "system": {
    "cpu": 8,
    "memory": {
      "total": 17179869184,
      "free": 8589934592,
      "used": 8589934592
    },
    "uptime": 86400,
    "loadAverage": [0.5, 0.7, 0.8],
    "nodeMemory": {
      "heapUsed": 125829120,
      "heapTotal": 251658240,
      "external": 5242880,
      "rss": 267386880
    },
    "timestamp": 1234571490000
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### **GET `/performance-metrics`**

Returns recent individual request metrics.

**Query Parameters**:
- `limit` (optional): Number of metrics to return (default: 100)

**Response**:
```json
{
  "metrics": [
    {
      "renderTime": 245.5,
      "cacheTime": 2.3,
      "totalTime": 312.8,
      "memoryBefore": { "heapUsed": 120000000, "rss": 260000000 },
      "memoryAfter": { "heapUsed": 125000000, "rss": 265000000 },
      "memoryDelta": {
        "heapUsed": 5000000,
        "heapTotal": 0,
        "external": 0,
        "rss": 5000000
      },
      "requestPath": "/course/api-510",
      "requestMethod": "GET",
      "timestamp": 1234571490000,
      "cacheHit": false,
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "count": 100,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📈 USAGE EXAMPLES

### 1. **View Performance Stats**

```bash
# Get last 60 minutes of stats
curl http://localhost:4000/performance-stats

# Get last 24 hours (1440 minutes)
curl http://localhost:4000/performance-stats?minutes=1440
```

### 2. **View Recent Metrics**

```bash
# Get last 100 requests
curl http://localhost:4000/performance-metrics

# Get last 1000 requests
curl http://localhost:4000/performance-metrics?limit=1000
```

### 3. **Monitor in Real-Time**

```bash
# Watch performance stats (Linux/Mac)
watch -n 5 'curl -s http://localhost:4000/performance-stats | jq'

# PowerShell (Windows)
while ($true) { 
  Invoke-RestMethod http://localhost:4000/performance-stats | ConvertTo-Json -Depth 10
  Start-Sleep -Seconds 5
}
```

---

## 🔍 ANGULAR DEVTOOLS

### Installation

1. Install Angular DevTools browser extension:
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/angular-devtools)
   - [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/angular-devtools/)

2. Build and serve SSR application:
   ```bash
   pnpm run build:ssr
   pnpm run serve:ssr
   ```

### Usage

1. Open Chrome DevTools (F12)
2. Navigate to "Angular" tab
3. Select your Angular app
4. Use profiler for component render analysis

**What to Monitor**:
- Component render times
- Change detection cycles
- Memory usage per component
- Network requests during SSR

**SSR-Specific Checks**:
- Verify components render during SSR (not just client)
- Check for duplicate API calls (server + client)
- Monitor hydration performance

---

## 🚀 CHROME LIGHTHOUSE SSR MODE

### Setup

1. Install Lighthouse CLI:
   ```bash
   npm install -g lighthouse
   ```

2. Start SSR server:
   ```bash
   pnpm run serve:ssr
   ```

### Run Lighthouse Audit

```bash
# Basic SSR audit
lighthouse http://localhost:4000 --only-categories=performance

# Full audit with SSR-specific settings
lighthouse http://localhost:4000 \
  --only-categories=performance,seo,accessibility \
  --chrome-flags="--headless" \
  --output=html \
  --output-path=./lighthouse-report.html

# Custom user agent (simulating search engine)
lighthouse http://localhost:4000 \
  --only-categories=performance \
  --extra-headers="{\"User-Agent\":\"Googlebot\"}"
```

### Analyze Results

**Key Metrics for SSR**:
- **Time to First Byte (TTFB)**: Should be < 600ms for SSR
- **First Contentful Paint (FCP)**: Should be < 1.8s
- **Largest Contentful Paint (LCP)**: Should be < 2.5s
- **Total Blocking Time (TBT)**: Should be < 200ms

**SSR-Specific Checks**:
- Verify HTML contains rendered content (not just shell)
- Check for blocking JavaScript
- Ensure CSS is inlined or loaded early
- Verify meta tags are present in HTML source

---

## 📊 NODE.JS PERFORMANCE HOOKS

### Built-in Monitoring

The performance monitor uses Node.js `perf_hooks` module:

```typescript
import { performance } from 'perf_hooks';

// Automatically tracks:
// - Render time
// - Cache lookup time
// - Total request time
// - Memory usage
```

### Custom Performance Marks

You can add custom marks in your code:

```typescript
import { performance } from 'perf_hooks';

// Mark start of operation
performance.mark('api-call-start');

// ... your code ...

// Mark end and measure
performance.mark('api-call-end');
performance.measure('api-call-duration', 'api-call-start', 'api-call-end');

const measure = performance.getEntriesByName('api-call-duration')[0];
console.log(`API call took ${measure.duration}ms`);
```

---

## 📝 LOGGING RENDER TIMES

### Automatic Logging

Performance metrics are automatically logged for each request. To view:

```bash
# Enable detailed logging (add to server.ts or use environment variable)
DEBUG=ssr:performance pnpm run serve:ssr
```

### Custom Logging

Add custom logging in `server.ts`:

```typescript
import { performanceMonitor } from './server.performance';

// After rendering
const metrics = performanceMonitor.endMeasure(markId, false);

if (metrics && metrics.renderTime > 1000) {
  console.warn(`⚠️  Slow render: ${metrics.requestPath} took ${metrics.renderTime.toFixed(2)}ms`);
}

if (metrics && metrics.memoryDelta.heapUsed > 10 * 1024 * 1024) {
  console.warn(`⚠️  High memory usage: ${metrics.requestPath} used ${(metrics.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
}
```

---

## 💾 MEMORY USAGE MONITORING

### Automatic Tracking

Memory usage is tracked for each request:
- Memory before rendering
- Memory after rendering
- Memory delta (heap, RSS, external)

### View Memory Stats

```bash
# Via performance-stats endpoint
curl http://localhost:4000/performance-stats | jq '.system.nodeMemory'

# Via performance-metrics endpoint
curl http://localhost:4000/performance-metrics | jq '.metrics[0].memoryDelta'
```

### Memory Alerting

Add to your monitoring script:

```bash
#!/bin/bash
THRESHOLD=80  # 80% memory usage

while true; do
  MEMORY=$(curl -s http://localhost:4000/performance-stats | jq '.system.memory.used / .system.memory.total * 100')
  
  if (( $(echo "$MEMORY > $THRESHOLD" | bc -l) )); then
    echo "⚠️  High memory usage: ${MEMORY}%"
    # Send alert...
  fi
  
  sleep 60
done
```

---

## 📊 MONITORING DASHBOARD

### Simple Dashboard Script

Create `scripts/monitoring-dashboard.js`:

```javascript
const http = require('http');

function fetchStats() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:4000/performance-stats', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function displayDashboard() {
  const stats = await fetchStats();
  const perf = stats.performance;
  const sys = stats.system;
  
  console.clear();
  console.log('='.repeat(80));
  console.log('SSR PERFORMANCE DASHBOARD');
  console.log('='.repeat(80));
  console.log(`\n📊 Requests (last ${(stats.timestamp - perf.timeRange.start) / 60000} min):`);
  console.log(`   Total: ${perf.totalRequests}`);
  console.log(`   Cache Hits: ${perf.cacheHits} (${(perf.cacheHits / perf.totalRequests * 100).toFixed(1)}%)`);
  console.log(`   Cache Misses: ${perf.cacheMisses}`);
  console.log(`\n⏱️  Performance:`);
  console.log(`   Avg Render Time: ${perf.avgRenderTime.toFixed(2)}ms`);
  console.log(`   P95 Render Time: ${perf.p95RenderTime.toFixed(2)}ms`);
  console.log(`   P99 Render Time: ${perf.p99RenderTime.toFixed(2)}ms`);
  console.log(`   Avg Total Time: ${perf.avgTotalTime.toFixed(2)}ms`);
  console.log(`\n💾 Memory:`);
  console.log(`   Avg Delta: ${(perf.avgMemoryDelta / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Max Delta: ${(perf.maxMemoryDelta / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Node Heap: ${(sys.nodeMemory.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(sys.nodeMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   System Used: ${(sys.memory.used / 1024 / 1024 / 1024).toFixed(2)}GB / ${(sys.memory.total / 1024 / 1024 / 1024).toFixed(2)}GB`);
  console.log(`\n🖥️  System:`);
  console.log(`   CPU Cores: ${sys.cpu}`);
  console.log(`   Load Average: ${sys.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
  console.log(`   Uptime: ${Math.floor(sys.uptime / 3600)}h ${Math.floor((sys.uptime % 3600) / 60)}m`);
  console.log('\n' + '='.repeat(80));
}

// Update every 5 seconds
setInterval(displayDashboard, 5000);
displayDashboard();
```

**Usage**:
```bash
node scripts/monitoring-dashboard.js
```

---

## 🔧 INTEGRATION WITH MONITORING TOOLS

### Prometheus Export

Create `scripts/prometheus-exporter.ts`:

```typescript
import express from 'express';
import { performanceMonitor } from '../server.performance';

const app = express();

app.get('/metrics', (req, res) => {
  const stats = performanceMonitor.getStats(60);
  const sys = performanceMonitor.getSystemMetrics();
  
  res.set('Content-Type', 'text/plain');
  res.send(`
# SSR Performance Metrics
ssr_requests_total ${stats.totalRequests}
ssr_cache_hits_total ${stats.cacheHits}
ssr_cache_misses_total ${stats.cacheMisses}
ssr_render_time_avg_ms ${stats.avgRenderTime}
ssr_render_time_p95_ms ${stats.p95RenderTime}
ssr_render_time_p99_ms ${stats.p99RenderTime}
ssr_memory_delta_avg_bytes ${stats.avgMemoryDelta}
nodejs_heap_used_bytes ${sys.nodeMemory.heapUsed}
nodejs_heap_total_bytes ${sys.nodeMemory.heapTotal}
  `.trim());
});

app.listen(9091, () => {
  console.log('Prometheus exporter on http://localhost:9091/metrics');
});
```

### Grafana Dashboard

Use the Prometheus exporter above and create Grafana dashboard with:
- Request rate graph
- Cache hit rate gauge
- Render time histogram (avg, p95, p99)
- Memory usage graph
- Error rate (if tracked)

---

## 🎯 BEST PRACTICES

### 1. **Monitor Key Metrics**
- Render time (target: < 500ms)
- Cache hit rate (target: > 80%)
- Memory usage (alert if > 500MB per request)
- Error rate (target: < 0.1%)

### 2. **Set Up Alerts**
- Render time > 1s
- Cache hit rate < 70%
- Memory usage > 1GB per request
- Error rate > 1%

### 3. **Regular Monitoring**
- Check performance stats daily
- Review slow renders weekly
- Analyze trends monthly

### 4. **Profiling Sessions**
- Profile before major releases
- Profile after optimization changes
- Profile high-traffic routes

---

## 📚 ADDITIONAL RESOURCES

- [Node.js Performance Hooks](https://nodejs.org/api/perf_hooks.html)
- [Angular DevTools](https://angular.io/guide/devtools)
- [Chrome Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Performance Monitoring Best Practices](https://web.dev/vitals/)

---

## 🔗 RELATED DOCUMENTATION

- `src/server.performance.ts` - Performance monitoring implementation
- `src/server.ts` - Performance integration
- `CACHING_IMPLEMENTATION_COMPLETE.md` - Caching strategy
- `SSR_STABILITY_SUMMARY.md` - Stability checks

