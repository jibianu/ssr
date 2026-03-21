# Public site (SSR) + Elearn (SPA) + API

## Architecture

| Path | Served by | Notes |
|------|-------------|--------|
| `/` | Node **SSR** (`npm run serve:ssr`) | Public marketing + SEO |
| `/courses`, `/blog`, `/events`, `/:slug` | Same SSR app | Slug pages use `slugPageResolver` for data before paint |
| `/Elearn/*` | **Elearn SPA** static (`dist/elearn/browser`) | Production `baseHref: /Elearn/` |
| `/app/*` | Same Elearn folder (optional) | Use only if Elearn is built with matching `baseHref` (e.g. `/app/`) |
| `/api/*` | .NET Core backend | Reverse proxy |

**Important:** If Elearn production uses `baseHref: /Elearn/`, users should open the app at `https://yoursite.com/Elearn/...`. Mounting both `/Elearn` and `/app` in `server.ts` uses the **same** `index.html`; asset URLs must match the build’s `baseHref` or links will 404.

## Build & run SSR locally

```bash
cd frontend/oilandgasclub
npm install
npm run build:ssr
npm run serve:ssr
# Default port 4000 (see server.ts). Set ELEARN_BROWSER_DIST if elearn output is not ../../elearn/browser relative to dist/site/server.
```

Verify SEO: open a course/blog URL → **View Page Source** → body should contain real text, not only `<app-root></app-root>`.

## Nginx example

```nginx
upstream api_backend {
  server 127.0.0.1:52287;
}
upstream ssr_node {
  server 127.0.0.1:4000;
}

server {
  listen 443 ssl;
  server_name www.example.com;

  location /api/ {
    proxy_pass http://api_backend/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Single Node process: SSR + Elearn static (see server.ts)
  location / {
    proxy_pass http://ssr_node;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Elearn dev (SPA only)

```bash
npm run start:elearn
# http://localhost:4201 — separate dev server; no SSR.
```
