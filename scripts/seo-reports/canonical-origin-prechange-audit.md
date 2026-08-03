# Pre-change audit — Canonical origin & sitemap (GSC domain property)

**Date:** 2026-08-03  
**Preferred origin:** `https://oilandgasclub.com`  
**Property:** `sc-domain:oilandgasclub.com`  
**Only submitted sitemap (target):** `https://oilandgasclub.com/sitemap.xml`

---

## 1. Current sitemap generation flow

1. Browser/crawler requests `/sitemap.xml` on the Node SSR host.
2. Express `seo-backend-proxy.ts` proxies to .NET `SeoController.GetSitemap`.
3. `SeoController` builds XML from DB (static hubs + categories + courses + blogs + events).
4. Base URL from `StripePaymentConfig:PublicSiteUrl` → currently `https://oilandgasclub.com`.
5. Cached in memory 15 minutes (`SitemapCacheKeys.XmlDocument`).
6. Static `projects/site/src/robots.txt` (and .NET `GetRobots`) both declare:
   `Sitemap: https://oilandgasclub.com/sitemap.xml`

---

## 2. Live production snapshot (curl.exe, 2026-08-03)

| URL | Result |
|---|---|
| `https://www.oilandgasclub.com/sitemap.xml` | **301** → `https://oilandgasclub.com/sitemap.xml` |
| `https://oilandgasclub.com/sitemap.xml` | **200** `application/xml` (~59KB, ~344 apex locs) |
| www `<loc>` count inside sitemap | **0** |
| `robots.txt` Sitemap line | only non-www |
| `https://www.oilandgasclub.com/api-570-exam-questions-and-answers` | **301** → apex slug |

Nginx www→apex is live. Earlier soft-200 on www appears resolved on the edge.

---

## 3. Canonical origin sources (today)

| Layer | Source | Value |
|---|---|---|
| Angular | `environment.seoUrl` | `https://oilandgasclub.com/` |
| CanonicalService / SeoService / MetadataService | `environment.seoUrl` | apex |
| Express seo-shell / www redirect | hardcoded apex string | apex |
| .NET sitemap/robots | `StripePaymentConfig:PublicSiteUrl` | `https://oilandgasclub.com` |
| Affiliate / some emails | `App:FrontendBaseUrl` | `https://oilandgasclub.com/course` (elearn mount — intentional) |

**Gap:** No single named `CANONICAL_ORIGIN` constant shared across Node + .NET; fallbacks that use `Request.Host` could emit www if config is empty and the request hits .NET via a www Host.

---

## 4. Hardcoded host inventory

| Occurrence | Classification |
|---|---|
| `docs/nginx-ssr-production.example.conf` www/blog/elearn server_names | **Intentional legacy redirect** |
| `seo-policy.ts` `registerWwwCanonicalRedirect` / blog host redirect | **Intentional legacy redirect** |
| `angular.json` allowed hosts incl. www | **Safe to retain** (dev SSR host allowlist) |
| `Elearn.Serverless/appsettings.json` CORS `https://www.oilandgasclub.com` | **Safe to retain** (CORS must allow legacy host during redirect era) |
| `CoursesApi.Api/appsettings.json` CORS www | **Safe to retain** |
| `docs/s3-cors-config.json` www / elearn | **Safe to retain** (S3 CORS) |
| SEO audit scripts probing www/blog | **Intentional tests** |
| `NGINX_SSR.md` text suggesting seoUrl may be www | **Must update docs** (outdated) |
| `tmp-blog-ssr.html` | Artifact — ignore |
| Affiliate docs mentioning `elearn.oilandgasclub.com` | Docs / historical; live redirects to apex |

**App code that must stay apex for public SEO:** already largely correct. Hardening = never emit www from sitemap/robots/canonical builders.

---

## 5. Nginx / Express redirects

- **Nginx example + live:** HTTP any host → HTTPS apex; HTTPS www → apex; blog/www.blog → apex; elearn → apex.
- **Express safety net:** `registerWwwCanonicalRedirect` + `registerLegacyBlogHostRedirect` (blog root → `/blog`).
- Trailing slash stripped in Express after legacy `/course`/`/courses` handlers.

---

## 6. robots.txt

Static build + .NET both list **only** `https://oilandgasclub.com/sitemap.xml`. No www sitemap line.

---

## 7. Structured data / OG / internal links

- Public components use `environment.seoUrl` or hardcoded `https://oilandgasclub.com`.
- Footer blog link already `/blog` (relative).
- EventService payment domain previously fixed to non-www.

---

## 8. Files requiring changes (this pass)

1. Shared frontend `canonical-origin.ts` (+ wire Seo/Canonical/seo-shell/seo-policy).
2. `SeoController.GetPublicSiteBaseUrl` — strip www / force https apex default.
3. Expand `scripts/validate-sitemap.mjs` → CSV + MD + empty app-root / H1 / soft-404.
4. Extend `seo-redirect-audit.mjs` for www sitemap + sample course.
5. `ecosystem.config.cjs.example` for PM2 env (`CANONICAL_ORIGIN`, API URLs).
6. Fix outdated `NGINX_SSR.md` seoUrl note.
7. Pre/post reports under `scripts/seo-reports/`.

---

## 9. Risk assessment

| Risk | Mitigation |
|---|---|
| Changing CORS to remove www breaks browsers that still hit www before redirect | Keep www in CORS allowlists |
| Sitemap cache still serving old www locs | Invalidate after PublicSiteUrl confirm; 15m TTL |
| Over-aggressive validate-sitemap fails CI on temporary 503 | Document CONCURRENCY/CHECK flags; fail only on hard violations |
| FrontendBaseUrl `/course` used for public affiliate links | Out of scope unless AffiliateController builds public course URLs wrongly — spot-check only |

**Do not mark GSC complete until:** remove www sitemap from GSC UI manually; re-verify curls after any deploy.
