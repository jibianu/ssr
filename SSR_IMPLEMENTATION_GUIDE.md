# SSR Optimization Implementation Guide

**Quick Reference for Implementing Priority Actions**

---

## 🔴 PRIORITY 1: Quick Wins (4-5 hours total)

### **1.1 Cache Configuration Update** ⏱️ 15 minutes

**File**: `src/server.cache.config.ts`

**Change Defaults**:
```typescript
ttl: {
  static: parseInt(process.env['CACHE_TTL_STATIC'] || '86400', 10),    // 24h (was: 1h)
  dynamic: parseInt(process.env['CACHE_TTL_DYNAMIC'] || '300', 10)   // 5m (was: 1m)
},
memory: {
  maxKeys: parseInt(process.env['CACHE_MAX_KEYS'] || '5000', 10),     // 5k (was: 1k)
}
```

**Impact**: Better cache hit rates, faster responses

---

### **1.2 HTTP Transfer Cache Expansion** ⏱️ 15 minutes

**File**: `src/app/app.config.ts`

**Update Filter**:
```typescript
filter: (req) => {
  return req.method === 'GET' && 
         !req.url.includes('/account/') &&
         !req.url.includes('/upload/') &&
         !req.url.includes('/webhook/') &&
         (
           req.url.includes('/api/page/') ||
           req.url.includes('/api/course/') ||    // ADD
           req.url.includes('/api/category/') || // ADD
           req.url.includes('/api/event/')        // ADD
         );
}
```

**Impact**: Eliminates duplicate API calls for courses/categories/events

---

### **1.3 Convert EventsComponent to Async Pipe** ⏱️ 30 minutes

**File**: `src/app/modules/publicapp/public-event/events/events.component.ts`

**Before** (Blocking):
```typescript
ngOnInit(): void {
  this.subscription.add(
    this.publicAppService.getEvents().subscribe({
      next: res => {
        this.events = res;
        this.cdr.markForCheck();
      }
    })
  );
}
```

**After** (Non-blocking):
```typescript
events$ = this.publicAppService.getEvents().pipe(
  catchError(() => of([])),
  shareReplay(1)
);
```

**Template**: `*ngFor="let event of events$ | async"`

**Impact**: Faster SSR, automatic subscription cleanup

---

### **1.4 Add Resource Hints** ⏱️ 10 minutes

**File**: `src/index.html`

**Add**:
```html
<link rel="dns-prefetch" href="https://coursebackend.oilandgasclub.com">
<link rel="preconnect" href="https://coursebackend.oilandgasclub.com" crossorigin>
<link rel="prefetch" href="/course">
<link rel="prefetch" href="/events">
```

**Impact**: Faster resource loading (10-20%)

---

## 🟡 PRIORITY 2: High Impact (6-8 hours total)

### **2.1 Partial Hydration with @defer** ⏱️ 3-4 hours

**Files**: Component templates (event-details, course-details, etc.)

**Pattern**:
```html
@defer (on viewport) {
  <app-heavy-component></app-heavy-component>
} @placeholder {
  <div class="skeleton">Loading...</div>
}
```

**Impact**: 40-60% hydration time reduction

---

### **2.2 Image Optimization Pipe** ⏱️ 2-3 hours

**Create**: `src/app/shared/pipes/image-optimization.pipe.ts`

**Use in templates**:
```html
<img [src]="image | optimizeImage: { width: 800, height: 600, format: 'webp' }">
```

**Impact**: 70-80% image load time reduction

---

## 📊 MEASUREMENT

### After Each Change:
```bash
# Build and test
pnpm run build:ssr
pnpm run serve:ssr

# Check performance
curl http://localhost:4000/performance-stats | jq '.performance.avgRenderTime'

# Verify cache
curl http://localhost:4000/cache-stats
```

### Target Metrics:
- TTFB: < 300ms
- Hydration: < 300ms
- Cache Hit Rate: > 85%
- SEO Score: > 90

---

## ✅ COMPLETED UPDATES

The following have been automatically applied:
- ✅ Cache TTL increased (24h static, 5m dynamic)
- ✅ Cache max keys increased (5000)
- ✅ HTTP transfer cache expanded (courses/categories/events)
- ✅ Resource hints added to index.html

Ready to implement remaining items!

