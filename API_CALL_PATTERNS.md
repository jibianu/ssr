# API Call Patterns with Proxy Configuration

## Overview

This guide explains how API calls work with the proxy configuration in both development and production environments.

---

## 🔧 Current Implementation

### **Service Pattern** (Recommended ✅)

Services use `this.apiUrl + 'endpoint'` pattern:

```typescript
// Example: PublicAppService
export class PublicAppService {
    apiUrl = environment.apiUrl;  // '/api/' in dev, full URL in prod
    
    getCourses(params): Observable<any> {
        return this.http.get<any>(this.apiUrl + 'page/course', { params });
        // Development: /api/page/course → Proxied → https://localhost:52045/page/course
        // Production: https://coursebackend.oilandgasclub.com/page/course
    }
    
    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(this.apiUrl + 'page/category');
        // Development: /api/page/category → Proxied → https://localhost:52045/page/category
        // Production: https://coursebackend.oilandgasclub.com/page/category
    }
}
```

**How It Works**:

| Environment | `apiUrl` | Final URL | Proxy Behavior |
|------------|----------|-----------|---------------|
| Development | `'/api/'` | `/api/page/course` | ✅ Proxied to `https://localhost:52045/page/course` |
| Production | `'https://coursebackend.oilandgasclub.com/'` | `https://coursebackend.oilandgasclub.com/page/course` | ❌ No proxy (direct connection) |

---

## 📋 API Call Examples

### **1. Using Service Pattern** (Current - Recommended ✅)

```typescript
// ✅ RECOMMENDED: Uses environment.apiUrl
this.http.get(this.apiUrl + 'page/course');
// Development: /api/page/course (proxied)
// Production: https://coursebackend.oilandgasclub.com/page/course
```

**Benefits**:
- ✅ Automatic environment switching
- ✅ Works with proxy in dev, direct in prod
- ✅ Single source of truth (`environment.ts`)
- ✅ Easy to maintain

---

### **2. Direct `/api/` Path** (Alternative)

```typescript
// Alternative: Direct /api/ prefix
this.http.get('/api/page/course');
// Development: /api/page/course (proxied)
// Production: ⚠️ Will fail - /api/ doesn't exist in production!
```

**Note**: This pattern only works in development. In production, it would fail because `/api/` is not a real endpoint on the production server.

---

## 🎯 Current Service Implementation

All services in your codebase follow the recommended pattern:

### **PublicAppService**:

```typescript
// ✅ Current implementation
getCourses(params): Observable<any> {
    return this.http.get<any>(this.apiUrl + 'page/course', { params });
}

getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl + 'page/category');
}

getCourseByCanonicalURL(url: string): Observable<any> {
    const apiPath = `page/course/course/${normalizedUrl}`;
    return this.http.get<any>(this.apiUrl + apiPath);
}
```

### **AdminAppService**:

```typescript
// ✅ Current implementation
getCourses(params): Observable<any> {
    return this.http.get<any>(this.apiUrl + 'page/course', { params });
}

getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl + 'page/category');
}
```

### **AuthenticationService**:

```typescript
// ✅ Current implementation
login(username: string, password: string): Observable<string> {
    return this.http.post<any>(this.apiUrl + 'page/account/login', { username, password });
}
```

---

## 🔄 Request Flow

### **Development Mode** (`ng serve`):

```
1. Service Call: this.apiUrl + 'page/course'
   ↓
2. apiUrl = '/api/' (from environment.ts)
   ↓
3. Final URL: '/api/page/course'
   ↓
4. Browser sends: http://localhost:4200/api/page/course
   ↓
5. Angular Dev Server Proxy intercepts: /api/*
   ↓
6. Proxy rewrites: Strips /api → /page/course
   ↓
7. Proxy forwards: https://localhost:52045/page/course
   ↓
8. Backend receives: https://localhost:52045/page/course
   ✅ Success!
```

### **Production Mode** (`ng build --configuration production`):

```
1. Service Call: this.apiUrl + 'page/course'
   ↓
2. apiUrl = 'https://coursebackend.oilandgasclub.com/' (from environment.prod.ts)
   ↓
3. Final URL: 'https://coursebackend.oilandgasclub.com/page/course'
   ↓
4. Browser sends: https://coursebackend.oilandgasclub.com/page/course
   ↓
5. No proxy involved (direct connection)
   ↓
6. Backend receives: https://coursebackend.oilandgasclub.com/page/course
   ✅ Success!
```

---

## 📝 API Endpoint Patterns

### **Current Backend Endpoints**:

Based on your service implementations:

- **Courses**: `page/course`
- **Course by ID**: `page/course/id/{id}`
- **Course by URL**: `page/course/course/{url}`
- **Course with Location**: `page/course/course/{url}/location/{location}`
- **Dashboard Courses**: `page/course/Dashboard`
- **Categories**: `page/category`
- **Events**: `page/event/dashboard`
- **Account Login**: `page/account/login`

### **Service Usage**:

```typescript
// ✅ Current pattern (recommended)
this.http.get(this.apiUrl + 'page/course');
this.http.get(this.apiUrl + 'page/category');
this.http.post(this.apiUrl + 'page/account/login', data);
```

---

## ⚠️ Common Mistakes to Avoid

### **1. Hardcoded `/api/` in Services**:

```typescript
// ❌ DON'T DO THIS (breaks in production)
this.http.get('/api/page/course');

// ✅ DO THIS (works in all environments)
this.http.get(this.apiUrl + 'page/course');
```

### **2. Hardcoded Full URLs**:

```typescript
// ❌ DON'T DO THIS (not configurable)
this.http.get('https://localhost:52045/page/course');

// ✅ DO THIS (uses environment config)
this.http.get(this.apiUrl + 'page/course');
```

### **3. Missing `apiUrl` in Service**:

```typescript
// ❌ DON'T DO THIS
export class MyService {
    constructor(private http: HttpClient) {}
    
    getData() {
        return this.http.get('page/course'); // Missing base URL!
    }
}

// ✅ DO THIS
export class MyService {
    apiUrl = environment.apiUrl;
    
    constructor(private http: HttpClient) {}
    
    getData() {
        return this.http.get(this.apiUrl + 'page/course');
    }
}
```

---

## ✅ Best Practices

1. **Always use `this.apiUrl`** from `environment.apiUrl`
2. **Never hardcode `/api/`** in service code
3. **Never hardcode full backend URLs** in service code
4. **Keep endpoint paths relative** (e.g., `'page/course'`, not `/page/course`)
5. **Let environment config handle** the base URL switching

---

## 🔍 Verification

### **Check Current Setup**:

```typescript
// In any component or service
console.log('API URL:', environment.apiUrl);
// Development: '/api/'
// Production: 'https://coursebackend.oilandgasclub.com/'
```

### **Test API Call**:

```typescript
// In browser console (development)
fetch('/api/page/category')
  .then(r => r.json())
  .then(console.log);

// Should proxy to: https://localhost:52045/page/category
```

---

## 📚 Summary

✅ **Your current implementation is correct!**

- Services use `this.apiUrl + 'endpoint'` pattern
- `environment.apiUrl` = `'/api/'` in development
- `environment.prod.apiUrl` = Full production URL
- Proxy automatically handles `/api/*` → `https://localhost:52045/*`
- No changes needed in service code

The example `this.http.get('/api/courses')` you showed would work in development, but would fail in production. Your current pattern (`this.apiUrl + 'page/course'`) is the recommended approach that works in both environments.

---

**Status**: ✅ Current implementation is correct and follows best practices!
