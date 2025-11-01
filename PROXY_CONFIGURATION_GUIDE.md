# Angular Proxy Configuration Guide

## Overview

This guide explains how the proxy configuration works to connect your Angular frontend to the local .NET Core backend during development.

---

## 🔧 Proxy Configuration

### **Two-Proxy Setup**:

1. **Client-Side Proxy** (`proxy.conf.json`) - For browser requests during `ng serve`
2. **SSR Proxy** (`src/server.ts`) - For server-side API requests during SSR

---

### **1. Client-Side Proxy** (`proxy.conf.json`)

```json
{
  "/api": {
    "target": "https://localhost:52045",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "ws": true,
    "pathRewrite": {
      "^/api": ""
    },
    "headers": {
      "Connection": "keep-alive"
    }
  }
}
```

**How It Works**:

1. **Browser Request**: `http://localhost:4200/api/page/category`
2. **Proxy Intercepts**: Angular dev server sees `/api` prefix
3. **Proxy Forwards**: `https://localhost:52045/api/page/category`
4. **Path Rewrite**: Strips `/api` prefix → `https://localhost:52045/page/category`
5. **Backend Receives**: `https://localhost:52045/page/category`

**Result**: All browser requests to `/api/*` are proxied to `https://localhost:52045/*` (with `/api` stripped)

---

### **2. SSR Proxy** (`src/server.ts`)

The SSR server also includes a proxy middleware that handles `/api/*` requests during server-side rendering:

```typescript
// Only enabled in development mode
if (isDevelopment) {
  app.use('/api', createProxyMiddleware({
    target: backendUrl, // https://localhost:52045
    changeOrigin: true,
    secure: false, // Accept self-signed SSL certificates
    pathRewrite: { '^/api': '' } // Strip /api prefix
  }));
}
```

**How It Works**:

1. **SSR Request**: During SSR, Angular makes HTTP request to `/api/page/category`
2. **SSR Proxy Intercepts**: Express middleware sees `/api` prefix
3. **Proxy Forwards**: `https://localhost:52045/api/page/category`
4. **Path Rewrite**: Strips `/api` prefix → `https://localhost:52045/page/category`
5. **Backend Receives**: `https://localhost:52045/page/category`

**Result**: Both browser and SSR requests use the same `/api/` prefix and get proxied correctly!

---

## 📋 Configuration Details

### **Proxy Options Explained**:

- **`target`**: The backend server URL (`https://localhost:52045`)
- **`secure: false`**: Accepts self-signed SSL certificates (for local development)
- **`changeOrigin: true`**: Changes the origin header to match the target (required for CORS)
- **`logLevel: "debug"`**: Shows detailed proxy logs in terminal
- **`pathRewrite: { "^/api": "" }`**: Strips `/api` prefix before forwarding
- **`ws: true`**: Enables WebSocket proxying (if needed)

---

## 🔄 Environment Configuration

### **Development** (`environment.ts`):

```typescript
export const environment = {
  production: false,
  apiUrl: '/api/',  // ✅ Uses proxy prefix
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300'
};
```

**How It Works**:
- Service calls: `this.apiUrl + 'page/category'` → `/api/page/category`
- Proxy intercepts: `/api/page/category`
- Proxy forwards to: `https://localhost:52045/page/category`

### **Production** (`environment.prod.ts`):

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://coursebackend.oilandgasclub.com/',  // ✅ Full URL (no proxy)
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300'
};
```

**How It Works**:
- Service calls: `this.apiUrl + 'page/category'` → `https://coursebackend.oilandgasclub.com/page/category`
- No proxy needed (direct connection)

---

## 🚀 Usage

### **Start Development Server with Proxy**:

**For Client-Side Development**:
```bash
ng serve
```
- Uses `proxy.conf.json` for browser requests
- Automatically enabled for `development` configuration

**For SSR Development**:
```bash
# Build first
pnpm run build:ssr

# Then serve with SSR
pnpm run serve:ssr
```
- Uses SSR proxy in `src/server.ts` for server-side requests
- Automatically enabled in development mode (`NODE_ENV !== 'production'`)

### **Verify Proxy is Working**:

**Client-Side Proxy**:
1. Start backend: `dotnet run` (should start on `https://localhost:52045`)
2. Start Angular: `ng serve`
3. Open browser: `http://localhost:4200`
4. Check browser console - API calls should go to `/api/page/...`
5. Check terminal - you should see proxy logs if `logLevel: "debug"` is set

**SSR Proxy**:
1. Start backend: `dotnet run` (should start on `https://localhost:52045`)
2. Build and serve SSR: `pnpm run build:ssr && pnpm run serve:ssr`
3. Check server logs - should see: `✅ SSR API Proxy configured: /api/* → https://localhost:52045/*`
4. Make a request - SSR should successfully fetch from backend via proxy

---

## 🔍 Troubleshooting

### **Issue: "404 Not Found" on API calls**

**Possible Causes**:
1. Backend not running → **Fix**: Start backend with `dotnet run`
2. Wrong proxy target → **Fix**: Verify `target` matches backend URL
3. Path rewrite issue → **Fix**: Check `pathRewrite` configuration
4. CORS not configured → **Fix**: Configure CORS in backend (see `BACKEND_CORS_CONFIGURATION.md`)

### **Issue: "Proxy Error" in terminal**

**Check**:
- Backend is running on correct port (52045)
- SSL certificate is trusted or use `secure: false`
- Proxy configuration syntax is correct (valid JSON)

### **Issue: "Network Error" in browser**

**Check**:
- Backend is accessible at `https://localhost:52045`
- CORS is configured in backend
- SSL certificate is trusted (or change to HTTP)

---

## 📝 Alternative Configurations

### **Option 1: Use HTTP Instead of HTTPS**

If SSL certificate issues occur:

```json
{
  "/api": {
    "target": "http://localhost:52045",  // Change to HTTP
    "secure": false,
    "changeOrigin": true
  }
}
```

And update environment:
```typescript
apiUrl: '/api/',  // Still uses /api prefix
```

### **Option 2: Different Backend Port**

If backend runs on different port:

```json
{
  "/api": {
    "target": "http://localhost:8080",  // Different port
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": {
      "^/api": ""
    }
  }
}
```

### **Option 3: Multiple Proxy Targets**

If you need to proxy multiple paths:

```json
{
  "/api": {
    "target": "https://localhost:52045",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": { "^/api": "" }
  },
  "/auth": {
    "target": "https://localhost:52046",
    "secure": false,
    "changeOrigin": true
  }
}
```

---

## ✅ Benefits of Proxy Configuration

1. **No CORS Issues**: 
   - Client proxy makes requests from same origin (localhost:4200)
   - SSR proxy makes requests from server (no browser CORS restrictions)

2. **SSL Certificate Handling**: `secure: false` accepts self-signed certs

3. **Clean URLs**: Services use `/api/` prefix, both proxies handle forwarding

4. **SSR Compatible**: 
   - Client proxy handles browser requests (`ng serve`)
   - SSR proxy handles server-side requests (`serve:ssr`)

5. **Development Only**: Both proxies only active in development mode

6. **Production Unaffected**: Production builds use full URLs (no proxy)

7. **Unified Configuration**: Same `/api/` prefix works for both client and SSR

---

## 🔗 Related Files

- `proxy.conf.json` - Client-side proxy configuration (browser requests)
- `src/server.ts` - SSR proxy configuration (server-side requests)
- `angular.json` - Proxy configuration reference
- `src/environments/environment.ts` - Development API URL (`/api/`)
- `src/environments/environment.prod.ts` - Production API URL (full URL)
- `BACKEND_CORS_CONFIGURATION.md` - Backend CORS setup
- `package.json` - Includes `http-proxy-middleware` dependency

---

## 🎯 Configuration Summary

### **Development Mode**:
- **Client**: `apiUrl: '/api/'` → Proxied via `proxy.conf.json` → `https://localhost:52045/`
- **SSR**: `apiUrl: '/api/'` → Proxied via `src/server.ts` → `https://localhost:52045/`
- **Both use same `/api/` prefix** ✅

### **Production Mode**:
- **Client**: `apiUrl: 'https://coursebackend.oilandgasclub.com/'` → Direct connection
- **SSR**: `apiUrl: 'https://coursebackend.oilandgasclub.com/'` → Direct connection
- **No proxy needed** ✅

---

## ⚙️ Environment Variables

**For SSR Proxy** (`src/server.ts`):
- `BACKEND_URL` - Override backend URL (default: `https://localhost:52045`)
- `NODE_ENV` - Set to `production` to disable SSR proxy

**Example**:
```bash
# Use different backend URL for SSR
BACKEND_URL=http://localhost:8080 pnpm run serve:ssr

# Disable SSR proxy (use production mode)
NODE_ENV=production pnpm run serve:ssr
```

---

**Status**: ✅ Complete proxy configuration for both client and SSR ready to use!
