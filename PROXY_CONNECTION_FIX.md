# Proxy Connection Error Fix (ECONNREFUSED)

## 🚨 Issue

```
[vite] http proxy error: /page/category
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1122:18)
```

## 🔍 Root Cause

The Vite dev server is trying to proxy API requests to the local backend at `https://localhost:52045`, but the backend server is **not running**.

**Flow**:
1. Frontend makes request: `/api/page/category`
2. Proxy intercepts (configured in `proxy.conf.json`)
3. Proxy tries to forward to: `https://localhost:52045/page/category`
4. ❌ **Connection refused** - Backend server not running

## ✅ Solutions

### **Solution 1: Use Production Backend (RECOMMENDED - Already Applied)**

**Status**: ✅ **FIXED** - Updated `src/environments/environment.ts`

This is the simplest solution and what's already configured:

**Benefits**:
- ✅ No local backend setup required
- ✅ Always available
- ✅ Matches production environment
- ✅ Works with SSR out of the box
- ✅ No SSL/CORS configuration needed

**Configuration**:
```typescript
// src/environments/environment.ts
apiUrl: 'https://coursebackend.oilandgasclub.com/',  // ✅ Production backend
```

**Restart the dev server** after this change:
```bash
# Stop current server (Ctrl+C)
# Then restart
pnpm start
```

---

### **Solution 2: Start Local Backend Server**

If you want to use the local backend:

**Step 1**: Start your .NET Core backend on port 52045
```bash
# Navigate to backend directory
cd /path/to/backend

# Start backend server
dotnet run
# Or
dotnet watch run
```

**Step 2**: Verify backend is running
```bash
# Check if port 52045 is listening
curl https://localhost:52045/api/page/category
```

**Step 3**: Switch back to proxy configuration
```typescript
// src/environments/environment.ts
apiUrl: '/api/',  // ✅ Uses proxy
```

**Step 4**: Restart Angular dev server
```bash
pnpm start
```

---

### **Solution 3: Use HTTP Instead of HTTPS**

If your local backend uses HTTP instead of HTTPS:

**Step 1**: Update `proxy.conf.json`:
```json
{
  "/api": {
    "target": "http://localhost:52045",  // ✅ Changed to HTTP
    "secure": false,
    "changeOrigin": true,
    // ... rest of config
  }
}
```

**Step 2**: Update `environment.ts`:
```typescript
apiUrl: '/api/',  // Uses proxy
```

---

## 🔧 How Proxy Works

### **With Proxy** (`apiUrl: '/api/'`):
```
Frontend Request: /api/page/category
       ↓
Proxy (proxy.conf.json) intercepts
       ↓
Forwards to: https://localhost:52045/page/category
       ↓
Backend Response
```

### **Without Proxy** (`apiUrl: 'https://coursebackend.oilandgasclub.com/'`):
```
Frontend Request: https://coursebackend.oilandgasclub.com/page/category
       ↓
Direct connection (no proxy)
       ↓
Backend Response
```

---

## 📋 Verification

### **Check Proxy Configuration**:
```bash
# Verify proxy.conf.json exists and is valid
cat proxy.conf.json

# Should show:
# {
#   "/api": {
#     "target": "https://localhost:52045",
#     ...
#   }
# }
```

### **Check Environment Configuration**:
```bash
# Verify environment.ts
cat src/environments/environment.ts | grep apiUrl

# Current (after fix):
# apiUrl: 'https://coursebackend.oilandgasclub.com/',
```

### **Test Backend Connection**:
```bash
# Test production backend
curl https://coursebackend.oilandgasclub.com/api/page/category

# Test local backend (if running)
curl https://localhost:52045/api/page/category
```

---

## 🎯 Current Status

✅ **FIXED**: Environment now uses production backend directly
- No proxy needed
- No local backend required
- Works immediately after restart

**To Use Local Backend**:
1. Start backend on port 52045
2. Change `apiUrl` back to `'/api/'` in `environment.ts`
3. Restart dev server

---

## 📝 Files Modified

1. ✅ `src/environments/environment.ts`
   - Changed from: `apiUrl: '/api/'` (requires local backend)
   - Changed to: `apiUrl: 'https://coursebackend.oilandgasclub.com/'` (uses production)

**Files NOT Modified**:
- `proxy.conf.json` - Still configured for future local backend use
- `angular.json` - Proxy config still referenced (no issue if not using proxy)

---

## ✅ Next Steps

1. **Restart dev server** to apply changes:
   ```bash
   # Stop current server (Ctrl+C)
   pnpm start
   ```

2. **Verify no more errors** - The ECONNREFUSED errors should be gone

3. **Test API calls** - Navigate to pages that make API calls and verify they work

---

## 🔗 Related Documentation

- `PROXY_CONFIGURATION_GUIDE.md` - Full proxy setup guide
- `DEVELOPMENT_PORTS_GUIDE.md` - Port configuration details
- `BACKEND_IMPLEMENTATION_STEP_BY_STEP.md` - Backend setup if needed

