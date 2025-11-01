# Backend Configuration Guide

## Current Issue Analysis

**Error**: `Network Error: Unable to connect to API server at https://localhost:52045/page/course/course/pipenet-training`

**Root Cause**: The frontend is trying to connect to a local backend server at `https://localhost:52045/` which is either:
1. Not running
2. Not accessible due to SSL certificate issues
3. Blocked by firewall/CORS

---

## 🔧 Backend Configuration Suggestions

### **Option 1: Use Production Backend for Development (RECOMMENDED)**

This is the simplest solution and what we previously configured:

**Change in Frontend**:
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  // ✅ Use production backend (already configured and working)
  apiUrl: 'https://coursebackend.oilandgasclub.com/',
  // Comment out local backend:
  // apiUrl: 'https://localhost:52045/',
  
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300'
};
```

**Benefits**:
- ✅ No local backend setup required
- ✅ Always available
- ✅ Matches production environment
- ✅ Works with SSR out of the box

---

### **Option 2: Configure Local Backend (If You Must Use Local)**

If you need to use a local backend at `https://localhost:52045/`, configure the following:

#### **2.1 Backend CORS Configuration**

Your backend (ASP.NET Core/DotNet) needs to allow requests from:
- `http://localhost:4200` (Angular dev server)
- `http://localhost:4000` (SSR server)
- Your production domain

**Backend Code (ASP.NET Core)**:
```csharp
// Startup.cs or Program.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddCors(options =>
    {
        options.AddPolicy("AllowAngularSSR",
            builder =>
            {
                builder
                    .WithOrigins(
                        "http://localhost:4200",  // Angular dev server
                        "http://localhost:4000",  // SSR server
                        "https://oilandgasclub.com",  // Production
                        "https://www.oilandgasclub.com"
                    )
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();  // If using cookies/auth
            });
    });
}

public void Configure(IApplicationBuilder app)
{
    app.UseCors("AllowAngularSSR");
    // ... rest of middleware
}
```

#### **2.2 SSL Certificate Configuration**

If using `https://localhost:52045/`, you need a valid SSL certificate:

**Option A: Use HTTP instead of HTTPS (Easier for local dev)**
```typescript
// src/environments/environment.ts
apiUrl: 'http://localhost:52045/',  // Use HTTP instead of HTTPS
```

**Option B: Trust Self-Signed Certificate**
```bash
# Windows (PowerShell as Administrator)
# Download the certificate from https://localhost:52045/ and install it
# Or disable SSL verification for localhost (NOT RECOMMENDED FOR PRODUCTION)
```

**Backend Configuration for Self-Signed Cert**:
```csharp
// For development only - allow self-signed certificates
if (environment.IsDevelopment())
{
    services.Configure<KestrelServerOptions>(options =>
    {
        options.ConfigureHttpsDefaults(httpsOptions =>
        {
            httpsOptions.ServerCertificate = // your cert
            httpsOptions.ClientCertificateMode = ClientCertificateMode.NoCertificate;
        });
    });
}
```

#### **2.3 Backend Port and Binding**

Ensure your backend is listening on the correct port:

**ASP.NET Core Configuration**:
```json
// appsettings.json or appsettings.Development.json
{
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://localhost:52045"
      },
      "Http": {
        "Url": "http://localhost:52045"
      }
    }
  }
}
```

Or use `Properties/launchSettings.json`:
```json
{
  "profiles": {
    "CourseBackend": {
      "applicationUrl": "https://localhost:52045;http://localhost:52040"
    }
  }
}
```

#### **2.4 Firewall Configuration**

Ensure Windows Firewall allows connections on port 52045:

```powershell
# PowerShell as Administrator
New-NetFirewallRule -DisplayName "Course Backend API" `
    -Direction Inbound `
    -LocalPort 52045 `
    -Protocol TCP `
    -Action Allow
```

---

## 📋 API Endpoint Structure Verification

Your frontend expects this API structure:

### **Current API Endpoints Used**:
1. **Course by URL**: `GET /page/course/course/{course-slug}`
   - Example: `/page/course/course/pipenet-training`
   
2. **Course by URL + Location**: `GET /page/course/course/{course-slug}/location/{location-slug}`
   - Example: `/page/course/course/pipenet-training/location/dubai`

3. **Dashboard Categories**: `GET /page/course/Dashboard`

4. **Categories**: `GET /page/category`

5. **Events**: `GET /page/event`

6. **Locations**: `GET /page/location`

7. **Icons**: `GET /page/icon`

### **Backend Verification Checklist**:

✅ **Verify these endpoints exist and return JSON**:
```bash
# Test endpoints (replace with your actual backend URL)
curl https://coursebackend.oilandgasclub.com/page/course/course/pipenet-training
curl https://coursebackend.oilandgasclub.com/page/category
curl https://coursebackend.oilandgasclub.com/page/course/Dashboard
```

✅ **Verify response format**:
- All endpoints should return JSON
- Status code: 200 for success, 404 for not found
- Proper `Content-Type: application/json` header

✅ **Verify CORS headers** (if using local backend):
```bash
curl -H "Origin: http://localhost:4200" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://localhost:52045/page/course/course/pipenet-training \
     -v
```

Expected CORS headers in response:
```
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 🔐 Security Recommendations

### **For Local Development**:
1. **Use HTTP instead of HTTPS** (easiest)
   ```typescript
   apiUrl: 'http://localhost:52045/'
   ```

2. **Or use production backend** (recommended)
   ```typescript
   apiUrl: 'https://coursebackend.oilandgasclub.com/'
   ```

### **For Production**:
1. **Always use HTTPS**
2. **Implement proper authentication**
3. **Rate limiting**
4. **API versioning**

---

## 🚀 Recommended Solution

**I recommend using the production backend for development** because:

1. ✅ **No Configuration Needed**: Already working
2. ✅ **SSR Compatible**: Production backend works with SSR
3. ✅ **Consistent Environment**: Matches production
4. ✅ **No SSL Issues**: Valid SSL certificate
5. ✅ **CORS Configured**: Already allows your domains

**Quick Fix**:
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'https://coursebackend.oilandgasclub.com/',  // ✅ Change this
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300'
};
```

---

## 📝 Backend Checklist (If Using Local Backend)

If you MUST use local backend, ensure:

- [ ] Backend is running on `https://localhost:52045/` (or `http://localhost:52045/`)
- [ ] CORS is configured to allow `http://localhost:4200` and `http://localhost:4000`
- [ ] SSL certificate is valid (or use HTTP)
- [ ] Firewall allows port 52045
- [ ] API endpoints return correct JSON format
- [ ] API endpoints match the expected structure (`/page/course/course/{slug}`)
- [ ] Backend logs show incoming requests

---

## 🐛 Troubleshooting

### **Error: "fetch failed"**
- **Cause**: Backend not running or unreachable
- **Fix**: Start backend or use production backend

### **Error: "CORS policy blocked"**
- **Cause**: Backend CORS not configured
- **Fix**: Add CORS configuration to backend (see 2.1)

### **Error: "SSL certificate invalid"**
- **Cause**: Self-signed certificate or wrong certificate
- **Fix**: Use HTTP or trust the certificate

### **Error: "404 Not Found"**
- **Cause**: API endpoint doesn't exist or wrong path
- **Fix**: Verify API endpoint structure matches frontend expectations

---

## 📞 Next Steps

1. **Immediate Fix**: Change `environment.ts` to use production backend
2. **Long-term**: If you need local backend, follow Option 2 configuration
3. **Verify**: Test API endpoints with curl or Postman

**Would you like me to update the environment file to use the production backend?**
