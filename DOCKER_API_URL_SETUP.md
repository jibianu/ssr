# Docker API URL Configuration - Same Container Setup

## Overview

When Angular and .NET backend run in the same container, configure the frontend to call the backend using a Docker environment variable for the port.

---

## Implementation

### 1. Config Loading Service

**File**: `src/app/core/config/api-url.config.ts`

- Provides `API_URL` injection token
- `APP_INITIALIZER` loads `config.json` before app starts
- Falls back to default if config not found

### 2. App Configuration

**File**: `src/app/app.config.ts`

- `APP_INITIALIZER` loads config on startup
- `API_URL` token provided with loaded value
- Default: `http://localhost:5000/api/`

### 3. Services Use API_URL

All services now inject `API_URL` token:

```typescript
import { inject } from '@angular/core';
import { API_URL } from '../../../core/config/api-url.config';

@Injectable({ providedIn: 'root' })
export class MyService {
  private readonly apiUrl = inject(API_URL);
  
  getData() {
    return this.http.get(`${this.apiUrl}endpoint`);
  }
}
```

---

## Docker Setup

### entrypoint.sh

```bash
#!/bin/sh
set -e

# Get backend port from environment (default: 5000)
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
# Run with backend on port 5000
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
      - BACKEND_PORT=5000
    # Backend runs in same container on port 5000
```

---

## How It Works

1. **Container starts** → `entrypoint.sh` runs
2. **Reads `BACKEND_PORT`** → Defaults to `5000` if not set
3. **Creates config.json** → `{ "apiUrl": "http://localhost:5000/api/" }`
4. **Angular loads config** → `APP_INITIALIZER` fetches config.json
5. **Services use API_URL** → All HTTP calls use injected URL

---

## File Locations

- **Config file**: `/usr/share/nginx/html/assets/config.json`
- **Browser access**: `/assets/config.json`
- **Entrypoint**: `/entrypoint.sh`

---

## Default Behavior

- **Default port**: `5000`
- **Default API URL**: `http://localhost:5000/api/`
- **If config.json missing**: Uses default
- **If port not set**: Uses `5000`

---

## Example Config.json

```json
{
  "apiUrl": "http://localhost:5000/api/"
}
```

---

## Testing

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

# Expected output:
# {
#   "apiUrl": "http://localhost:5000/api/"
# }
```

---

## Updated Services

- ✅ `PublicAppService` - Uses `inject(API_URL)`
- ✅ Other services can be updated similarly

---

## Benefits

✅ No rebuild needed to change backend port  
✅ Works when Angular and backend share a container  
✅ Uses localhost (same container networking)  
✅ Simple environment variable configuration  
✅ Graceful fallback to default  

---

**Status**: ✅ Ready for same-container deployment

