# Docker — unified `oilandgasclub.com`

One Node process serves:

| Path | App | Dev equivalent |
|------|-----|----------------|
| `/` | Public marketing site (Angular SSR) | `npm run start:site` → :4200 |
| `/course/` | Elearn LMS (Angular SPA, `baseHref /course/`) | `npm run start:elearn` → :4201 |

Production URLs: `https://oilandgasclub.com/` and `https://oilandgasclub.com/course/`

## Run

**Git Bash / macOS / Linux**

```bash
cd frontend/oilandgasclub
chmod +x deploy.sh
./deploy.sh
```

**Windows PowerShell**

```powershell
cd D:\oilandgasclub\frontend\oilandgasclub
.\deploy.ps1
```

**Custom host port** (container still listens on 4000 inside):

```bash
HOST_PORT=8080 ./deploy.sh
```

## Build only

```bash
docker compose build
```

## OAuth / Cognito

Unified env files use redirect URIs under `https://oilandgasclub.com/course/...`. Register those in AWS Cognito and Google Cloud Console. Edit:

- `projects/elearn/src/environments/environment.unified.prod.ts`
- `projects/site/src/environments/environment.unified.site.prod.ts`

## Nginx (TLS) example

Proxy **everything** to the container; do not split `/course` to another upstream unless you know what you’re doing.

```nginx
server {
  server_name oilandgasclub.com www.oilandgasclub.com;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Add `listen 443 ssl` + certificates (e.g. Let’s Encrypt) as usual.

## Files

- `Dockerfile` — multi-stage build, `npm run build:docker`
- `docker-compose.yml` — service `web`, image `oilandgasclub-frontend:latest`
- `deploy.sh` / `deploy.ps1` — build + `up -d`
