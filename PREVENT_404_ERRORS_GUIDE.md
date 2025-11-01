# Preventing 404 Errors Before API Loads - Guide

## Overview

This guide explains how to prevent 404 errors that occur before API data is loaded in your Angular SSR application.

---

## 🔴 Common 404 Issues

### **Issue 1: Route Accessed Before Data Loads**

**Problem**: User navigates to `/pipenet-training` but the course data hasn't loaded yet, causing a 404 error.

**Current Solution**: Route resolvers handle this ✅

### **Issue 2: API Server Not Running**

**Problem**: Frontend tries to fetch data but backend is offline, causing "fetch failed" errors.

**Solution**: Implemented with retry logic and graceful error handling ✅

### **Issue 3: Invalid Course URLs**

**Problem**: User navigates to a course URL that doesn't exist in the backend.

**Solution**: Resolver redirects to 404 page ✅

---

## ✅ Current Error Handling (Already Implemented)

### **1. Route Resolvers**

Your routes already use resolvers to load data before navigation:

```typescript
// public-course-details.resolver.ts
export const publicCourseDetailsResolver: ResolveFn<unknown> = (snap) => {
  // ✅ Loads course data BEFORE component loads
  // ✅ Redirects to 404 if course not found
  return course$.pipe(
    map(course => {
      if (!course) {
        throw new Error('Course not found');
      }
      return course;
    }),
    catchError(() => redirectToNotFoundPage(router))
  );
};
```

### **2. Service-Level Error Handling**

Services return safe fallbacks on error:

```typescript
// ✅ Returns empty array instead of breaking
getDashboardCategories(): Observable<any> {
  return this.http.get(...).pipe(
    catchError(error => {
      console.error('Error fetching dashboard categories:', error);
      return of([]); // ✅ Safe fallback
    })
  );
}
```

### **3. Retry Logic**

Network errors are automatically retried:

```typescript
// ✅ Retry on network errors (not 4xx errors)
retry({
  count: 2,
  delay: (error, retryCount) => {
    if (error?.status >= 400 && error.status < 500) {
      return throwError(() => error); // Don't retry 404
    }
    return of(null).pipe(delay(1000 * retryCount));
  }
})
```

---

## 🔧 Additional Improvements

### **1. Add Health Check for Backend**

Create a service to check if backend is available:

```typescript
// src/app/core/services/backend-health.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BackendHealthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Check if backend API is available
   */
  checkHealth(): Observable<boolean> {
    // Use a lightweight endpoint like /page/category (small response)
    return this.http.get(`${this.apiUrl}page/category`, { 
      observe: 'response' 
    }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Check health with timeout (3 seconds)
   */
  checkHealthWithTimeout(): Observable<boolean> {
    return this.checkHealth().pipe(
      timeout(3000),
      catchError(() => of(false))
    );
  }
}
```

### **2. Show User-Friendly Messages**

Update components to show messages when backend is unavailable:

```typescript
// Example: In public-course-home.component.ts
export class PublicCourseHomeComponent {
  backendAvailable = true;
  private backendHealth = inject(BackendHealthService);

  ngOnInit(): void {
    // Check backend health
    this.backendHealth.checkHealthWithTimeout().subscribe(available => {
      this.backendAvailable = available;
      if (!available) {
        console.warn('⚠️ Backend API is not available. Please check if the server is running.');
      }
    });

    // Load data only if backend is available
    if (this.backendAvailable) {
      this.items$ = this.publicAppService.getDashboardCategories().pipe(
        // ... existing code
      );
    }
  }
}
```

### **3. Graceful Degradation in Templates**

Show placeholder content when API is unavailable:

```html
<!-- In component template -->
@if (!backendAvailable) {
  <div class="alert alert-warning">
    <h4>Service Temporarily Unavailable</h4>
    <p>The API server is not responding. Please check:</p>
    <ul>
      <li>Is the backend server running?</li>
      <li>Is the server accessible at {{ apiUrl }}?</li>
      <li>Are there network connectivity issues?</li>
    </ul>
    <button (click)="retryConnection()">Retry Connection</button>
  </div>
}
```

---

## 📋 Backend Recommendations

### **1. Add Health Check Endpoint**

**Backend** (`/api/health` or `/health`):

```csharp
// Controllers/HealthController.cs
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { 
            status = "healthy", 
            timestamp = DateTime.UtcNow 
        });
    }
}
```

**Frontend** (check before making requests):
```typescript
this.backendHealth.checkHealth().subscribe(available => {
  if (available) {
    // Make API calls
  } else {
    // Show error message
  }
});
```

### **2. Ensure API Endpoints Return Proper 404**

**Backend** should return:
```json
// For 404 Not Found
{
  "statusCode": 404,
  "message": "Course not found",
  "error": "Not Found"
}
```

**Frontend** already handles this in resolvers ✅

### **3. Add CORS Headers**

See `BACKEND_CORS_CONFIGURATION.md` for complete CORS setup.

---

## 🚀 Quick Start Checklist

### **Frontend (Already Done ✅)**:
- [x] Environment files configured (dev uses localhost, prod uses production)
- [x] Error handling in services (returns safe fallbacks)
- [x] Retry logic for network errors
- [x] Route resolvers redirect 404s
- [x] Timeout configuration (60 seconds)

### **Backend (You Need to Do)**:
- [ ] Configure CORS (see `BACKEND_CORS_CONFIGURATION.md`)
- [ ] Ensure backend is running on `https://localhost:52045/`
- [ ] Verify SSL certificate or use HTTP
- [ ] Test API endpoints return proper JSON
- [ ] Verify all endpoints match frontend expectations

---

## 🧪 Testing

### **Test Local Backend Connection**:

```bash
# Test if backend is running
curl https://localhost:52045/page/category

# Test CORS
curl -X OPTIONS https://localhost:52045/page/category \
  -H "Origin: http://localhost:4200" \
  -v
```

### **Test in Angular App**:

1. Start Angular: `ng serve`
2. Navigate to a course URL: `http://localhost:4200/pipenet-training`
3. Check browser console for API calls
4. Verify data loads correctly

---

## 📝 Summary

**Frontend**: ✅ Already configured and handles errors gracefully

**Backend**: You need to:
1. ✅ Configure CORS (use `BACKEND_CORS_CONFIGURATION.md`)
2. ✅ Ensure backend runs on `https://localhost:52045/` (or use HTTP)
3. ✅ Verify API endpoints return correct data

The Angular app will automatically:
- ✅ Retry failed requests
- ✅ Show user-friendly error messages
- ✅ Redirect 404s to not-found page
- ✅ Use production backend when building for production

**Next Step**: Configure CORS in your .NET Core backend using the guide in `BACKEND_CORS_CONFIGURATION.md`
