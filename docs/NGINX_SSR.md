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

## Troubleshooting: “SSR not working” / empty `<app-root>` in View Source

That HTML shell means the browser got the **client-only** `index.html`, not a server-rendered page. Common causes:

### 1. Nginx (or CDN) is **not** proxying to Node (most common)

If the public site uses something like:

```nginx
root /var/www/site/browser;
location / { try_files $uri $uri/ /index.html; }
```

then **every URL** returns static `index.html` → empty `<app-root>` until JavaScript runs. **Angular SSR never executes.**

**Fix:** For `location /`, use **`proxy_pass`** to the Node process that runs `node dist/site/server/server.mjs` (Docker exposes this on port **4000** by default). Do **not** serve `dist/site/browser` directly for HTML routes.

### 2. Node runs but SSR falls back to CSR

The Express server falls back to `index.html` when the Angular SSR engine returns no response or throws (e.g. API unreachable from the container, bootstrap error). Check **container logs** for `SSR Error:` or `csr-fallback`.

**Fix:** From inside the container, the app must reach your API. Set **`SSR_API_URL`** (or the URL in `environment.unified.site.prod.ts`) to a hostname the **container** can resolve (often your public API URL or `host.docker.internal`, **not** `https://localhost:52287` on the host).

### 3. Wrong process in Docker

The frontend image must run **`CMD ["node", "dist/site/server/server.mjs"]`** (see repo `Dockerfile`). If the container only runs `nginx` or a static file server, you get CSR only.

### 4. Cloudflare (or similar) caching HTML

If **Cache Everything** or aggressive page rules cache `text/html`, users can receive a **stale CSR shell** (generic `<title>`, no `og:*` tags) even when origin SSR is correct.

**Fix:** Bypass cache for document requests, or exclude HTML from edge cache. Purge cache after deploy.

### 5. `www` vs apex

`environment.seoUrl` / `CANONICAL_ORIGIN` must be the **non-www** marketing origin:

`https://oilandgasclub.com/`

Never set seoUrl to `https://www.oilandgasclub.com/`. Www hosts must 301 to apex (nginx + Express safety net); canonical/OG/JSON-LD always emit apex.

### Quick check: response header

When traffic hits the real Node SSR server, HTML responses include:

- `X-OGC-SSR: render` — fresh SSR  
- `X-OGC-SSR: cache` — SSR HTML from cache  
- `X-OGC-SSR: stream` — SSR streamed (no body cache)  
- `X-OGC-SSR: csr-fallback` — **CSR shell** (same as empty `app-root` in source)

Example:

```bash
curl -sI "https://oilandgasclub.com/your-course-slug" | grep -i x-ogc-ssr
```

- **No header** → response is **not** from this Node server (static hosting or another tier).  
- **`csr-fallback`** → Node is up but SSR failed; inspect logs and API URL from the container.

## Full production example

See **`docs/nginx-ssr-production.example.conf`** in this repo for a complete `server { }` block (proxy to Node `:4000`, API upstream, no `try_files` for `/`).

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
