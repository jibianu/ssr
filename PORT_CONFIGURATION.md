# Port Configuration Summary

## Overview

Your frontend and backend are running on **DIFFERENT PORTS** ✅ (This is correct and recommended)

---

## 🔌 Port Assignments

### **1. Frontend - Angular Dev Server**
- **Port**: `4200` (default Angular port)
- **URL**: `http://localhost:4200`
- **Command**: `ng serve` or `pnpm start`
- **Purpose**: Serves Angular application during development

### **2. Backend - .NET Core API**
- **Port**: `52045` (HTTPS)
- **URL**: `https://localhost:52045`
- **Purpose**: Serves API endpoints
- **Configuration**: Set in `proxy.conf.json`

### **3. SSR Server** (Production/Build)
- **Port**: `4000` (default, can be overridden with `PORT` env variable)
- **URL**: `http://localhost:4000`
- **Command**: `pnpm run serve:ssr`
- **Purpose**: Serves SSR application after build

---

## 📋 Configuration Details

### **Frontend Port** (`4200`):

**Location**: Angular default (can be changed with `--port` flag)

```bash
# Default (port 4200)
ng serve

# Custom port
ng serve --port 3000
```

**Configuration File**: Not explicitly set in `angular.json` (uses Angular default)

---

### **Backend Port** (`52045`):

**Location**: `proxy.conf.json`

```json
{
  "/api": {
    "target": "https://localhost:52045",  // ✅ Backend port
    "secure": false,
    "changeOrigin": true
  }
}
```

**Also in**: `src/server.ts` (SSR proxy):

```typescript
const backendUrl = process.env['BACKEND_URL'] || 'https://localhost:52045';
```

---

### **SSR Server Port** (`4000`):

**Location**: `src/server.ts`

```typescript
const port = process.env['PORT'] || 4000;
app.listen(port, async () => {
  console.log(`✅ Node Express server running at http://localhost:${port}`);
});
```

**Can be overridden**:
```bash
PORT=8080 pnpm run serve:ssr
```

---

## 🔄 Request Flow

### **Development Mode** (`ng serve`):

```
Browser → http://localhost:4200 (Frontend Angular)
           ↓
           /api/page/course (API Request)
           ↓
Proxy → https://localhost:52045/page/course (Backend API)
```

**Ports Used**:
- ✅ Frontend: `4200`
- ✅ Backend: `52045`
- ✅ Different ports ✅

---

### **SSR Mode** (`pnpm run serve:ssr`):

```
Browser → http://localhost:4000 (SSR Server)
           ↓
           /api/page/course (API Request during SSR)
           ↓
SSR Proxy → https://localhost:52045/page/course (Backend API)
           ↓
           Rendered HTML → Browser
```

**Ports Used**:
- ✅ SSR Server: `4000`
- ✅ Backend: `52045`
- ✅ Different ports ✅

---

## ✅ Why Different Ports Are Correct

### **1. Separation of Concerns**
- Frontend (4200): Handles UI and client-side routing
- Backend (52045): Handles API and business logic
- SSR (4000): Handles server-side rendering

### **2. Development Best Practice**
- ✅ Each service runs independently
- ✅ Can restart one without affecting the other
- ✅ Easier debugging and monitoring
- ✅ No port conflicts

### **3. Production Ready**
- ✅ Frontend and backend can be deployed separately
- ✅ Can scale independently
- ✅ Load balancing flexibility

---

## 🔍 Verification

### **Check Frontend Port**:

```bash
# Start Angular dev server
ng serve

# Should see:
# ✅ Angular Live Development Server is listening on localhost:4200
```

### **Check Backend Port**:

```bash
# Start .NET Core backend
dotnet run

# Should see:
# ✅ Now listening on: https://localhost:52045
```

### **Check SSR Port**:

```bash
# Build and serve SSR
pnpm run build:ssr
pnpm run serve:ssr

# Should see:
# ✅ Node Express server running at http://localhost:4000
```

---

## 📊 Port Summary Table

| Service | Port | Protocol | Environment | Purpose |
|---------|------|----------|-------------|---------|
| **Angular Dev Server** | `4200` | HTTP | Development | Frontend UI |
| **Backend API** | `52045` | HTTPS | Development | API endpoints |
| **SSR Server** | `4000` | HTTP | Production/Build | Server-side rendering |

---

## 🔧 Customizing Ports

### **Change Frontend Port**:

```bash
# Method 1: Command line
ng serve --port 3000

# Method 2: angular.json (add to serve.options)
{
  "serve": {
    "options": {
      "port": 3000,
      "proxyConfig": "proxy.conf.json"
    }
  }
}
```

### **Change Backend Port**:

1. Update `proxy.conf.json`:
```json
{
  "/api": {
    "target": "https://localhost:8080",  // New port
    ...
  }
}
```

2. Update `src/server.ts`:
```typescript
const backendUrl = process.env['BACKEND_URL'] || 'https://localhost:8080';
```

3. Update `.NET Core backend` configuration (appsettings.json or launchSettings.json)

### **Change SSR Port**:

```bash
# Method 1: Environment variable
PORT=8080 pnpm run serve:ssr

# Method 2: Update src/server.ts
const port = process.env['PORT'] || 8080;  // New default
```

---

## ⚠️ Common Issues

### **1. Port Already in Use**

```bash
# Error: Port 4200 is already in use
# Solution: Use different port
ng serve --port 4201
```

### **2. Backend Not Running**

```bash
# Error: Cannot connect to https://localhost:52045
# Solution: Start backend first
dotnet run
```

### **3. CORS Issues**

If backend and frontend are on different ports, ensure CORS is configured in `.NET Core backend`:
- Allow origin: `http://localhost:4200`
- Allow methods: GET, POST, PUT, DELETE, etc.

---

## ✅ Conclusion

**Your configuration is correct!** ✅

- ✅ Frontend: Port `4200`
- ✅ Backend: Port `52045`
- ✅ SSR: Port `4000`
- ✅ All on **different ports** (as they should be)

This setup follows best practices and allows for:
- Independent service management
- Easy debugging
- Production deployment flexibility
- No port conflicts

---

**Status**: ✅ Port configuration is correct and follows best practices!
