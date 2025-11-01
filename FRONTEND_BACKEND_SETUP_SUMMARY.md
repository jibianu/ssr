# Frontend & Backend Setup Summary

## ✅ Frontend Configuration (COMPLETED)

### **1. Environment Files Configured**

#### **Development** (`src/environments/environment.ts`):
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://localhost:52045/',  // ✅ Local backend
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300'
};
```

#### **Production** (`src/environments/environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://coursebackend.oilandgasclub.com/',  // ✅ Production backend
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300'
};
```

**How It Works**:
- `ng serve` → Uses `environment.ts` (localhost:52045)
- `ng build` → Uses `environment.ts` (localhost:52045)
- `ng build --configuration production` → Uses `environment.prod.ts` (production)

✅ **Automatically switches** based on build configuration!

---

## 🔧 Backend Configuration Required

### **Step 1: Configure CORS**

Add this to your **.NET Core backend** (`Program.cs` or `Startup.cs`):

```csharp
// Add CORS service
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularSSR",
        policy =>
        {
            policy
                .WithOrigins(
                    "http://localhost:4200",  // Angular dev server
                    "http://localhost:4000"  // SSR server
                )
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        });
});

// Use CORS middleware (BEFORE UseAuthentication/UseAuthorization)
app.UseCors("AllowAngularSSR");
```

**📖 Full Guide**: See `BACKEND_CORS_CONFIGURATION.md` for complete code examples.

---

### **Step 2: Choose SSL or HTTP**

#### **Option A: Use HTTP (EASIEST - Recommended for Local Dev)**

**Backend** (`Properties/launchSettings.json`):
```json
{
  "applicationUrl": "http://localhost:52045"  // HTTP instead of HTTPS
}
```

**Frontend** (`src/environments/environment.ts`):
```typescript
apiUrl: 'http://localhost:52045/',  // Change HTTPS to HTTP
```

#### **Option B: Use HTTPS with Self-Signed Certificate**

**Backend**: Generate and trust development certificate:
```bash
dotnet dev-certs https --trust
```

**Frontend**: No changes needed (browser will trust after running above command)

---

### **Step 3: Verify Backend is Running**

**Start your .NET Core backend**:
```bash
cd path/to/your/backend
dotnet run
```

**Verify it's accessible**:
```bash
curl http://localhost:52045/page/category
# or
curl https://localhost:52045/page/category
```

---

### **Step 4: Verify API Endpoints**

Ensure these endpoints exist and return JSON:

- ✅ `GET /page/course/course/{course-slug}` - Returns course data
- ✅ `GET /page/course/course/{course-slug}/location/{location-slug}` - Returns course with location
- ✅ `GET /page/course/Dashboard` - Returns dashboard categories
- ✅ `GET /page/category` - Returns categories list
- ✅ `GET /page/event` - Returns events
- ✅ `GET /page/location` - Returns locations
- ✅ `GET /page/icon` - Returns icons

**Test Endpoint**:
```bash
# Test course endpoint
curl http://localhost:52045/page/course/course/pipenet-training

# Expected: JSON response with course data
```

---

## 🚀 Quick Start Commands

### **1. Start Backend**:
```bash
cd path/to/backend
dotnet run
# Backend should start on http://localhost:52045 or https://localhost:52045
```

### **2. Start Angular Frontend**:
```bash
cd path/to/frontend
ng serve
# Frontend starts on http://localhost:4200
```

### **3. Test Connection**:
- Open browser: `http://localhost:4200`
- Navigate to a course: `http://localhost:4200/pipenet-training`
- Check browser console for API calls

---

## 🔍 Troubleshooting

### **Error: "Network Error: Unable to connect to API server"**

**Possible Causes**:
1. ❌ Backend not running → **Fix**: Start backend with `dotnet run`
2. ❌ Wrong port → **Fix**: Verify backend runs on port 52045
3. ❌ SSL certificate issue → **Fix**: Use HTTP or trust dev certificate
4. ❌ CORS not configured → **Fix**: Add CORS configuration (see Step 1)

### **Error: "CORS policy blocked"**

**Fix**: Add CORS configuration to backend (see Step 1 above)

### **Error: "404 Not Found" for course**

**Possible Causes**:
1. ❌ Course doesn't exist in backend → **Fix**: Verify course exists in database
2. ❌ Wrong API endpoint → **Fix**: Verify endpoint structure matches `/page/course/course/{slug}`
3. ❌ URL normalization issue → **Fix**: Check browser console for actual API URL being called

---

## 📋 Complete Backend Checklist

- [ ] Backend is running on `http://localhost:52045/` or `https://localhost:52045/`
- [ ] CORS is configured to allow `http://localhost:4200` and `http://localhost:4000`
- [ ] All API endpoints return JSON format
- [ ] API endpoints match frontend expectations:
  - `/page/course/course/{slug}`
  - `/page/category`
  - `/page/course/Dashboard`
- [ ] SSL certificate is trusted (if using HTTPS) OR using HTTP
- [ ] Firewall allows connections on port 52045
- [ ] Tested API endpoints with curl/Postman

---

## 📚 Documentation Files Created

1. ✅ **`BACKEND_CORS_CONFIGURATION.md`** - Complete .NET Core CORS setup guide
2. ✅ **`BACKEND_CONFIGURATION_GUIDE.md`** - General backend configuration guide
3. ✅ **`PREVENT_404_ERRORS_GUIDE.md`** - How to prevent 404 errors

---

## 🎯 Summary

**Frontend**: ✅ **FULLY CONFIGURED**
- Environment files set up for local/production switching
- Error handling prevents 404 issues
- Retry logic for network failures
- All optimizations in place

**Backend**: ⚠️ **YOU NEED TO CONFIGURE**
1. Add CORS configuration (copy from `BACKEND_CORS_CONFIGURATION.md`)
2. Ensure backend runs on correct port
3. Choose HTTP or HTTPS (HTTP is easier)
4. Test API endpoints

**Once backend is configured, everything will work automatically!** 🚀
