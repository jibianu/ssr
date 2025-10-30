# Deferred Hydration Implementation Guide

**Quick Start Guide for Implementing @defer Blocks**

---

## 🚀 QUICK IMPLEMENTATION

### **Step 1: Defer Carousels** (30 minutes)

**File**: `src/app/modules/publicapp/public-course/public-course-home/public-course-home.component.html`

```html
<!-- Replace existing carousel with deferred version -->
@defer (on viewport) {
  <owl-carousel-o [options]="customOptions" (dragging)="isDragging = $event.dragging">
    <ng-container *ngFor="let course of item.categoryCourse; trackBy: trackByCourseId">
      <ng-template carouselSlide>
        <!-- Existing course card content -->
      </ng-template>
    </ng-container>
  </owl-carousel-o>
} @placeholder {
  <div class="carousel-skeleton d-flex gap-3" style="overflow: hidden;">
    <div class="skeleton-card" *ngFor="let i of [1,2,3,4]" style="min-width: 300px; height: 400px; background: #f0f0f0; border-radius: 8px;"></div>
  </div>
}
```

---

### **Step 2: Defer Related Content** (30 minutes)

**File**: `src/app/modules/publicapp/public-event/event-details/event-details.component.html`

Find the section that loads upcoming events and wrap with @defer:

```html
<!-- Find existing upcoming events section -->
@defer (on viewport) {
  <!-- Existing upcoming events component or content -->
  <div class="upcoming-events">
    <h3>Upcoming Events</h3>
    <div *ngFor="let event of events">
      <!-- Event card -->
    </div>
  </div>
} @placeholder {
  <div class="upcoming-events-skeleton p-4">
    <div class="skeleton-card mb-3" style="height: 150px; background: #f0f0f0; border-radius: 8px;"></div>
    <div class="skeleton-card mb-3" style="height: 150px; background: #f0f0f0; border-radius: 8px;"></div>
    <div class="skeleton-card" style="height: 150px; background: #f0f0f0; border-radius: 8px;"></div>
  </div>
}
```

---

### **Step 3: Skip Hydration for Static Pages** (15 minutes)

**File**: `src/app/modules/publicapp/about-us/about-us.component.html`

Add `ngSkipHydration` to main container:

```html
<!-- Wrap static content -->
<div ngSkipHydration>
  <div class="container">
    <h1>About Us</h1>
    <p>Content here...</p>
  </div>
</div>
```

**Repeat for**:
- `contact-us.component.html`
- `terms-and-condition.component.html`
- `privacy-policy.component.html`
- Other static pages

---

### **Step 4: Defer Modal Components** (1 hour)

**File**: `src/app/modules/publicapp/public-event/event-details/event-details.component.ts`

```typescript
// Update modal opening method
async openRegistrationModal() {
  // Dynamic import modal component
  if (!this.modalComponentLoaded) {
    // Modal will be loaded on first open
    this.modalComponentLoaded = true;
  }
  
  const modalRef = this.modalService.open(EventRegistrationModalComponent, {
    size: 'lg',
    backdrop: 'static'
  });
  
  modalRef.componentInstance.event = this.event;
}
```

---

## 📊 TESTING

### **Before/After Comparison**

```bash
# 1. Build SSR app
pnpm run build:ssr

# 2. Start server
pnpm run serve:ssr

# 3. Open Chrome DevTools Performance tab
# 4. Record page load
# 5. Check "Hydration" marker time

# Expected improvement: 50-70% reduction in hydration time
```

### **Verify @defer Blocks**

```bash
# Check network tab - deferred components should load after initial render
# Components with @defer should show separate chunk loading
```

---

## 🎯 EXPECTED RESULTS

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Home Page | 1200ms | 400ms | 67% |
| Event Details | 1500ms | 500ms | 67% |
| Course Details | 1400ms | 450ms | 68% |

---

## ✅ CHECKLIST

- [ ] Carousels deferred (`@defer on viewport`)
- [ ] Related content deferred
- [ ] Static pages skip hydration
- [ ] Modals load on demand
- [ ] Placeholders added for all deferred content
- [ ] Performance tested
- [ ] No layout shifts (CLS)

---

## 🚨 COMMON ISSUES

### **Issue 1: Layout Shift (CLS)**

**Problem**: Placeholder doesn't match content size

**Solution**: Match placeholder dimensions to actual content

```html
<!-- ❌ Bad: No height -->
<div class="placeholder"></div>

<!-- ✅ Good: Matched dimensions -->
<div class="placeholder" style="height: 400px; min-width: 300px;"></div>
```

### **Issue 2: Deferred Component Not Loading**

**Problem**: Component doesn't appear when scrolled

**Solution**: Check viewport trigger

```html
<!-- ✅ Ensure on viewport trigger is correct -->
@defer (on viewport) {
  <!-- Component -->
}
```

### **Issue 3: Hydration Mismatches**

**Problem**: SSR and CSR render differently

**Solution**: Ensure deferred content is consistent

```typescript
// ✅ Use platform checks for client-only features
if (isPlatformBrowser(this.platformId)) {
  // Client-only code
}
```

---

## 📚 NEXT STEPS

1. Implement Phase 1 (Quick Wins) - 2-3 hours
2. Measure improvements
3. Implement Phase 2 (Advanced) - 3-4 hours
4. Final performance validation

---

## 🔗 REFERENCES

- [Angular @defer Documentation](https://angular.dev/guide/defer)
- `HYDRATION_PERFORMANCE_ANALYSIS.md` - Full analysis
- `SSR_ACTION_PLAN.md` - Overall optimization plan

