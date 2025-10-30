# Image Lazy Loading Implementation Guide

## Overview
This guide documents how to add lazy loading to all images in the application to improve First Contentful Paint (FCP) and reduce bandwidth usage.

---

## Quick Reference

### Above-Fold Images (Critical - Load Immediately)
```html
<img src="logo.svg" 
     alt="Logo" 
     loading="eager"
     width="100"
     height="50">
```

### Below-Fold Images (Defer Loading)
```html
<img src="course-image.jpg" 
     alt="Course" 
     loading="lazy"
     width="300"
     height="200"
     style="aspect-ratio: 3/2; object-fit: cover;">
```

### Dynamic Images (Angular Binding)
```html
<img [src]="course?.titleImageUrl" 
     (error)="onImgError($event)"
     alt="{{ course?.title }}"
     loading="lazy"
     width="300"
     height="200">
```

---

## Implementation Checklist

### ✅ Completed Files:
1. ✅ `src/index.html` - Added resource hints
2. ✅ `home.component.html` - Added eager loading to above-fold icons

### 📋 Files Needing Lazy Loading:

#### High Priority (Large Images):
- [ ] `src/app/modules/publicapp/home/home.component.html` - 20+ course/event images
- [ ] `src/app/modules/publicapp/public-course/public-course-list/public-course-list.component.html` - Course images
- [ ] `src/app/modules/publicapp/public-course/public-course-details/public-course-details.component.html` - Large course images
- [ ] `src/app/modules/publicapp/public-event/event-details/event-details.component.html` - Event images
- [ ] `src/app/modules/publicapp/public-course/public-category/public-category.component.html` - Category course images

#### Medium Priority:
- [ ] `src/app/modules/publicapp/public-course/public-course-home/public-course-home.component.html` - Carousel images
- [ ] `src/app/modules/publicapp/public-course/public-related-courses/public-related-courses.component.html` - Related course images
- [ ] `src/app/modules/adminapp/course/add-course/add-course.component.html` - Course upload images

---

## Best Practices

### 1. Always Add Dimensions
```html
<!-- ✅ GOOD -->
<img src="image.jpg" width="300" height="200" loading="lazy">

<!-- ❌ BAD (causes layout shift) -->
<img src="image.jpg" loading="lazy">
```

### 2. Use Aspect Ratio for Responsive Images
```html
<img src="image.jpg" 
     width="300" 
     height="200"
     loading="lazy"
     style="width: 100%; aspect-ratio: 3/2; object-fit: cover;">
```

### 3. Load Above-Fold Images Eagerly
```html
<!-- Above fold (critical) -->
<img src="hero.jpg" loading="eager" width="1200" height="600">

<!-- Below fold (defer) -->
<img src="content.jpg" loading="lazy" width="400" height="300">
```

### 4. Handle Error States
```html
<img [src]="imageUrl" 
     (error)="onImgError($event)"
     alt="Description"
     loading="lazy">
```

---

## Expected Impact

### Performance Improvements:
- **FCP**: 20-30% faster
- **TTI**: 15-25% faster
- **Bandwidth**: 60-70% reduction for below-fold images
- **CLS**: 80-90% reduction (with dimensions)

### Before vs After:
- **Before**: All 226+ images load immediately
- **After**: Only ~10-15 above-fold images load initially
- **Savings**: ~200-400KB initial page weight reduction

---

## Implementation Steps

1. **Identify Above-Fold Images**: Images visible without scrolling
   - Add `loading="eager"`
   - Ensure dimensions are specified

2. **Update Below-Fold Images**: 
   - Add `loading="lazy"`
   - Add width/height attributes
   - Use aspect-ratio CSS for responsive images

3. **Test Layout Shifts**: 
   - Check with Chrome DevTools
   - Verify CLS score improves

4. **Verify Lazy Loading**:
   - Use Network tab to see images load on scroll
   - Check Lighthouse score

---

## Template Pattern for Angular Components

```html
<!-- Static Image -->
<img src="assets/image.jpg" 
     alt="Description"
     loading="lazy"
     width="300"
     height="200">

<!-- Dynamic Image with Error Handling -->
<img [src]="item?.imageUrl || 'assets/placeholder.jpg'" 
     (error)="onImgError($event)"
     [alt]="item?.title || 'Image'"
     loading="lazy"
     width="300"
     height="200"
     class="card-img">

<!-- Component Error Handler -->
```

```typescript
onImgError(event: Event): void {
  const target = event.target as HTMLImageElement;
  if (target) {
    target.src = 'assets/img/placeholder.jpg';
  }
}
```

---

## Next Steps

1. ✅ Add resource hints (COMPLETED)
2. ✅ Remove cache headers (COMPLETED)
3. ⏳ Add lazy loading to all images (IN PROGRESS)
4. ⏳ Add image dimensions (IN PROGRESS)
5. ⏳ Test and verify improvements

---

**Status**: Implementation in progress  
**Priority**: HIGH  
**Estimated Time**: 2-3 hours for all images

