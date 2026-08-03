# Post-change report — Canonical origin & sitemap

## Live production (already true before this PR; re-verified 2026-08-03)

| Check | Result |
|---|---|
| www sitemap | **301** → `https://oilandgasclub.com/sitemap.xml` |
| apex sitemap | **200** `application/xml` |
| www locs inside sitemap | **0** |
| robots.txt Sitemap | only non-www |
| www article URL | **301** → apex |

## Code changes in this pass

| Area | Change |
|---|---|
| `canonical-origin.ts` | Shared `CANONICAL_ORIGIN` / `getCanonicalOrigin()` |
| `CanonicalService` / `SeoService` | Use shared origin helper |
| `server.seo-shell.ts` | Read `process.env.CANONICAL_ORIGIN` |
| `SeoController` | Never emit www base URL; lowercase + BOM-strip loc slugs; dedupe paths |
| `validate-sitemap.mjs` | Full CSV/MD report (host, slash, case, 200, canonical, empty shell) |
| `seo-redirect-audit.mjs` | www sitemap + api-570 cases |
| `ecosystem.config.cjs.example` | PM2 env for CANONICAL_ORIGIN + API URLs |
| `NGINX_SSR.md` | seoUrl must be non-www |

## Sitemap data quality (live validator)

Current production sitemap still has **mixed-case** and **duplicate** locs until the .NET `SeoController` deploy + cache clear lands:

- Uppercase path segments (e.g. `/Check-Valves`)
- BOM-prefixed slugs
- Duplicate locs for 2 URLs

After API deploy: invalidate sitemap memory cache (restart API or wait 15m) and re-run:

```bash
npm run seo:validate-sitemap
```

## Environment / PM2

```bash
CANONICAL_ORIGIN=https://oilandgasclub.com
PUBLIC_SITE_URL=https://oilandgasclub.com
PUBLIC_API_URL=https://coursebackend.oilandgasclub.com/
SSR_API_URL=https://coursebackend.oilandgasclub.com/
```

```bash
pm2 restart oilandgasclub-ssr --update-env
pm2 env <id>
```

.NET: keep `StripePaymentConfig:PublicSiteUrl=https://oilandgasclub.com`

## Nginx

Keep www HTTPS server as one-hop 301 to apex (already live). Example: `docs/nginx-ssr-production.example.conf`.

## Cache flush

- Node HTML SSR cache / CDN HTML purge after SSR deploy
- .NET sitemap memory cache: restart Elearn.Serverless or wait 15 minutes

## GSC (manual)

1. Property: `sc-domain:oilandgasclub.com`
2. Remove submitted sitemap `https://www.oilandgasclub.com/sitemap.xml`
3. Keep only `https://oilandgasclub.com/sitemap.xml`
4. Request indexing on a sample apex URL after deploy

## Curl verification

```bash
curl.exe -sI https://www.oilandgasclub.com/sitemap.xml
curl.exe -sI https://oilandgasclub.com/sitemap.xml
curl.exe -s https://oilandgasclub.com/sitemap.xml | findstr /i "www.oilandgasclub.com"
curl.exe -s https://oilandgasclub.com/robots.txt
curl.exe -sI https://www.oilandgasclub.com/api-570-exam-questions-and-answers
```

## Rollback

- Revert SeoController / frontend SEO commits
- Restore previous PM2 env
- `nginx -t && systemctl reload nginx` if nginx was edited
- Clear CDN / SSR caches again

## Completion gate

**Host/canonical/sitemap URL signals:** production already passes www→apex for sitemap and pages; robots and locs are non-www.

**Do not mark fully complete until:** API with lowercase/deduped sitemap is deployed, `npm run seo:validate-sitemap` exits 0 (format + status), and GSC drops the www sitemap submission.
