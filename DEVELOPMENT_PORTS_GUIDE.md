# Development Ports Configuration Guide

## Quick Reference

| Service | Port | URL | Change Method |
|---------|------|-----|---------------|
| **Frontend** | `4200` | `http://localhost:4200` | `angular.json` or `--port` flag |
| **Backend** | `52045` | `https://localhost:52045` | `proxy.conf.json` + `src/server.ts` |
| **SSR** | `4000` | `http://localhost:4000` | `PORT` env variable |

---

## 📋 Configuration Files

### **1. Frontend Port** (`4200`)

**Location**: `angular.json`

```json
{
  "serve": {
    "options": {
      "port": 4200,  // ✅ Explicitly configured
      "proxyConfig": "proxy.conf.json"
    }
  }
}
```

**Change Method**:
```bash
# Method 1: Update angular.json
# Change "port": 4200 to your desired port

# Method 2: Command line (temporary)
ng serve --port 3000

# Method 3: Update package.json script
"start": "ng serve --port 3000"
```

---

### **2. Backend Port** (`52045`)

**Locations**: 
- `proxy.conf.json`
- `src/server.ts`

**proxy.conf.json**:
```json
{
  "/api": {
    "target": "https://localhost:52045",  // ✅ Backend port
    "secure": false,
    "changeOrigin": true
  }
}
```

**src/server.ts**:
```typescript
const backendUrl = process.env['BACKEND_URL'] || 'https://localhost:52045';
```

**Change Method**:

1. Update `proxy.conf.json`:
```json
{
  "/api": {
    "target": "https://localhost:8080"  // New port
  }
}
```

2. Update `src/server.ts`:
```typescript
const backendUrl = process.env['BACKEND_URL'] || 'https://localhost:8080';
```

3. Update `.NET Core backend` configuration (appsettings.json or launchSettings.json)

**Or use environment variable**:
```bash
# Set BACKEND_URL before starting
export BACKEND_URL=https://localhost:8080
pnpm run serve:ssr
```

---

### **3. SSR Port** (`4000`)

**Location**: `src/server.ts`

```typescript
const port = process.env['PORT'] || 4000;
```

**Change Method**:

**Method 1: Environment Variable** (Recommended ✅):
```bash
PORT=8080 pnpm run serve:ssr
```

**Method 2: Update default in src/server.ts**:
```typescript
const port = process.env['PORT'] || 8080;  // New default
```

**Method 3: Create .env file** (if using dotenv):
```bash
PORT=8080
```

---

## 🚀 Quick Start Commands

### **Start All Services**:

```bash
# Terminal 1: Frontend
pnpm start
# → http://localhost:4200

# Terminal 2: Backend (.NET Core)
dotnet run
# → https://localhost:52045

# Terminal 3: SSR (after build)
pnpm run build:ssr
PORT=4000 pnpm run serve:ssr
# → http://localhost:4000
```

---

## 🔧 Custom Port Examples

### **Example 1: Change Frontend Port to 3000**

```bash
# Option 1: Command line
ng serve --port 3000

# Option 2: Update angular.json
{
  "serve": {
    "options": {
      "port": 3000
    }
  }
}
```

---

### **Example 2: Change Backend Port to 8080**

**Step 1**: Update `proxy.conf.json`:
```json
{
  "/api": {
    "target": "https://localhost:8080"
  }
}
```

**Step 2**: Update `src/server.ts`:
```typescript
const backendUrl = process.env['BACKEND_URL'] || 'https://localhost:8080';
```

**Step 3**: Update `.NET Core backend` to run on port 8080

---

### **Example 3: Change SSR Port to 8080**

```bash
# Method 1: Environment variable
PORT=8080 pnpm run serve:ssr

# Method 2: Update src/server.ts
const port = process.env['PORT'] || 8080;
```

---

## ✅ Verification

### **Check Frontend Port**:

```bash
# Start Angular
pnpm start

# Should see:
# ✅ Angular Live Development Server is listening on localhost:4200
```

**Verify in browser**: `http://localhost:4200`

---

### **Check Backend Port**:

```bash
# Start .NET Core backend
dotnet run

# Should see:
# ✅ Now listening on: https://localhost:52045
```

**Verify**: `curl https://localhost:52045/page/category` (or check browser network tab)

---

### **Check SSR Port**:

```bash
# Build and serve
pnpm run build:ssr
pnpm run serve:ssr

# Should see:
# ✅ Node Express server running at http://localhost:4000
```

**Verify**: `curl http://localhost:4000`

---

## 🔍 Troubleshooting

### **Issue: Port Already in Use**

```bash
# Error: Port 4200 is already in use
# Solution: Use different port
ng serve --port 4201
```

**Find process using port**:
```bash
# Windows
netstat -ano | findstr :4200

# Linux/Mac
lsof -i :4200
```

---

### **Issue: Proxy Not Working**

**Check proxy configuration**:
1. Verify `proxy.conf.json` exists
2. Verify `angular.json` has `"proxyConfig": "proxy.conf.json"`
3. Check backend is running on correct port
4. Verify `environment.ts` has `apiUrl: '/api/'`

**Test proxy**:
```bash
# Should proxy to backend
curl http://localhost:4200/api/page/category
```

---

### **Issue: CORS Errors**

If frontend (4200) and backend (52045) are on different ports:

**Backend must allow CORS**:
```csharp
// .NET Core Program.cs or Startup.cs
builder.Services.AddCors(options => {
    options.AddPolicy("AllowAngular", policy => {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

---

## 📊 Port Configuration Summary

**Current Configuration** (from `port-config.json`):

| Service | Port | Protocol | Config File |
|---------|------|----------|-------------|
| Frontend | 4200 | HTTP | `angular.json` |
| Backend | 52045 | HTTPS | `proxy.conf.json`, `src/server.ts` |
| SSR | 4000 | HTTP | `src/server.ts` |

---

## 💡 Best Practices

1. **Keep default ports** unless there's a conflict
2. **Use environment variables** for SSR port (allows easy override)
3. **Document port changes** in team documentation
4. **Update all config files** when changing backend port
5. **Test proxy** after changing any port

---

## 🔗 Related Files

- `angular.json` - Frontend port configuration
- `proxy.conf.json` - Backend proxy configuration
- `src/server.ts` - SSR port and backend URL
- `port-config.json` - Port configuration reference
- `.dev-ports.env.example` - Environment variable template

---

**Status**: ✅ Port configuration is explicit and easily manageable!
