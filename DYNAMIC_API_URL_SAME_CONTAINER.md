# Dynamic API URL Configuration - Same Container Setup

## ✅ Implementation Complete

Dynamic API URL configuration for Angular app running in the **same Docker container** as .NET backend.

---

## 🎯 Solution Overview

When Angular and .NET backend run in the **same container**, the frontend needs to call `http://localhost:{PORT}/api/` where `{PORT}` comes from Docker environment variable `BACKEND_PORT`.

### How It Works

1. **Container starts** → `entrypoint.sh` reads `BACKEND_PORT` (default: 5000)
2. **Generates config.json** → Creates `/usr/share/nginx/html/assets/config.json` with `http://localhost:{PORT}/api/`
3. **Angular loads config** → `APP_INITIALIZER` fetches config.json before app starts
4. **Services use API_URL** → All services inject `API_URL` token

---

## 📁 Files Created/Modified

### 1. **API URL Config** (`src/app/core/config/api-url.config.ts`)

**Purpose**: Injection token and config loading logic.

**Key Features**:
- `API_URL` injection token
- `loadApiUrl()` - Loads config.json via `APP_INITIALIZER`
- `getApiUrl()` - Returns loaded URL or default
- Default: `http://localhost:5000/api/`

### 2. **App Configuration** (`src/app/app.config.ts`)

**Changes**:
- Added `APP_INITIALIZER` to load config before app starts
- Provides `API_URL` token with loaded value

**Code**:
```typescript
{
  provide: APP_INITIALIZER,
  useFactory: loadApiUrl,
  multi: true
},
{
  provide: API_URL,
  useFactory: () => getApiUrl()
}
```

### 3. **Service Update** (`src/app/modules/publicapp/publicapp.service.ts`)

**Before**:
```typescript
apiUrl = environment.apiUrl;
```

**After**:
```typescript
import { API_URL } from '../../../core/config/api-url.config';
private readonly apiUrl = inject(API_URL);
```

### 4. **Docker Entrypoint** (`entrypoint.sh`)

**Purpose**: Generates `config.json` from `BACKEND_PORT` environment variable.

**Features**:
- Reads `BACKEND_PORT` (default: 5000)
- Constructs `http://localhost:{PORT}/api/`
- Creates config.json in `/usr/share/nginx/html/assets/`

---

## 🐳 Docker Setup

### entrypoint.sh

```bash
#!/bin/sh
set -e

# Get backend port (default: 5000)
BACKEND_PORT="${BACKEND_PORT:-5000}"

# Construct API URL (same container = localhost)
API_URL="http://localhost:${BACKEND_PORT}/api/"

# Create assets directory
mkdir -p /usr/share/nginx/html/assets

# Generate config.json
cat > /usr/share/nginx/html/assets/config.json <<EOF
{
  "apiUrl": "${API_URL}"
}
EOF

echo "✅ Generated config.json with API_URL: ${API_URL}"

# Execute main command
exec "$@"
```

### Dockerfile Example

```dockerfile
FROM nginx:alpine

# Copy Angular build
COPY dist/Course/browser /usr/share/nginx/html

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Run

```bash
# Run with backend on port 5000 (default)
docker run -e BACKEND_PORT=5000 -p 80:80 my-app

# Or different port
docker run -e BACKEND_PORT=8080 -p 80:80 my-app
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - BACKEND_PORT=5000  # .NET backend port in same container
```

---

## 📋 config.json Format

**Location**: `/usr/share/nginx/html/assets/config.json`

**Content**:
```json
{
  "apiUrl": "http://localhost:5000/api/"
}
```

**Browser Access**: `/assets/config.json`

---

## 💻 Usage in Services

### Pattern for All Services

```typescript
import { inject } from '@angular/core';
import { API_URL } from '../../../core/config/api-url.config';

@Injectable({ providedIn: 'root' })
export class MyService {
  private readonly apiUrl = inject(API_URL);
  
  constructor(private http: HttpClient) {}
  
  getData() {
    return this.http.get(`${this.apiUrl}endpoint`);
  }
}
```

### Current Implementation

- ✅ `PublicAppService` - Updated to use `inject(API_URL)`

**Other services can be updated similarly**:
- `AdminAppService`
- `AuthenticationService`
- `BackendHealthService`
- Any service using `environment.apiUrl`

---

## 🔄 Migration Steps for Other Services

1. **Remove environment import**:
   ```typescript
   // Remove: import { environment } from '...';
   ```

2. **Add API_URL import**:
   ```typescript
   import { inject } from '@angular/core';
   import { API_URL } from '../../../core/config/api-url.config';
   ```

3. **Update apiUrl property**:
   ```typescript
   // Before
   apiUrl = environment.apiUrl;
   
   // After
   private readonly apiUrl = inject(API_URL);
   ```

---

## ✅ Default Behavior

- **Default port**: `5000`
- **Default API URL**: `http://localhost:5000/api/`
- **If `BACKEND_PORT` not set**: Uses default port
- **If `config.json` missing**: Uses default URL
- **SSR**: Returns default during SSR (loads on client)

---

## 🧪 Testing

### Local Development

Create `src/assets/config.json`:
```json
{
  "apiUrl": "http://localhost:5000/api/"
}
```

### Docker Testing

```bash
# Verify config generation
docker run -e BACKEND_PORT=5000 my-app cat /usr/share/nginx/html/assets/config.json

# Expected:
# {
#   "apiUrl": "http://localhost:5000/api/"
# }

# Test with different port
docker run -e BACKEND_PORT=8080 my-app cat /usr/share/nginx/html/assets/config.json

# Expected:
# {
#   "apiUrl": "http://localhost:8080/api/"
# }
```

### Browser Verification

1. Open browser DevTools Console
2. Look for: `✅ Loaded API URL from config: http://localhost:5000/api/`
3. Check Network tab: Request to `/assets/config.json`

---

## 📊 Flow Diagram

```
Container Startup
    ↓
entrypoint.sh executes
    ↓
Reads BACKEND_PORT env var (default: 5000)
    ↓
Generates: { "apiUrl": "http://localhost:5000/api/" }
    ↓
Saves to: /usr/share/nginx/html/assets/config.json
    ↓
Angular APP_INITIALIZER runs
    ↓
Fetches /assets/config.json
    ↓
Stores config in memory
    ↓
Provides API_URL token with loaded value
    ↓
Services inject API_URL
    ↓
All HTTP calls use dynamic URL
```

---

## 🎯 Benefits

✅ **No Rebuild Required** - Change backend port via environment variable  
✅ **Same Container** - Works when Angular and backend share container  
✅ **Localhost Networking** - Uses container-local networking  
✅ **Environment-Specific** - Different ports for dev/staging/prod  
✅ **Type-Safe** - Angular dependency injection  
✅ **SSR Compatible** - Works with Angular SSR  
✅ **Graceful Fallback** - Uses default if config missing  

---

## 🔧 Environment Variable

### `BACKEND_PORT`

- **Description**: Port where .NET backend runs in the same container
- **Default**: `5000`
- **Format**: Integer (e.g., `5000`, `8080`)
- **Usage**: `docker run -e BACKEND_PORT=5000 ...`

---

## 📝 Example: Complete Dockerfile

```dockerfile
# Stage 1: Build Angular
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm run build

# Stage 2: Nginx + Entrypoint
FROM nginx:alpine
COPY --from=builder /app/dist/Course/browser /usr/share/nginx/html
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

---

## ✅ Status

- ✅ API URL config loader created
- ✅ APP_INITIALIZER configured
- ✅ API_URL injection token provided
- ✅ PublicAppService updated
- ✅ Docker entrypoint script created
- ✅ Default fallback configured
- ✅ SSR compatibility ensured

**Ready for same-container deployment!**

---

## 🚀 Next Steps

1. Update remaining services to use `inject(API_URL)`:
   - `AdminAppService` ✅ (already reverted by user)
   - `AuthenticationService`
   - `BackendHealthService` ✅ (already reverted by user)

2. Update Dockerfile to include `entrypoint.sh`

3. Test in Docker environment:
   ```bash
   docker build -t my-app .
   docker run -e BACKEND_PORT=5000 -p 80:80 my-app
   ```

---

## 📚 Files Reference

| File | Status |
|------|--------|
| `src/app/core/config/api-url.config.ts` | ✅ Created |
| `src/app/app.config.ts` | ✅ Updated |
| `src/app/modules/publicapp/publicapp.service.ts` | ✅ Updated |
| `entrypoint.sh` | ✅ Created |
| `DOCKER_API_URL_SETUP.md` | ✅ Documentation |

---

**Implementation Complete** ✅

