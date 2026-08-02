# Canonical audit summary — Phase 1 (pre-change production)

**Audit date:** 2026-08-02 (live production)  
**Preferred domain:** `https://oilandgasclub.com` (HTTPS, non-www, no trailing slash)  
**GSC issue:** “Duplicate, Google chose different canonical than user”  
**Raw data:** `scripts/seo-reports/canonical-audit.csv`

Google-selected canonicals were **not** available in an imported GSC export in-repo; findings below use live HTTP signals that explain why Google would ignore the user-declared tag.

---

## 1. Affected URLs — user-declared vs live signal

| Reported URL | User-declared canonical | Initial status | SSR body | Canonical count | Likely Google conflict |
|---|---|---|---|---|---|
| `https://oilandgasclub.com/events` | `https://oilandgasclub.com/events` | **200** | Empty `<app-root>` (~13 KB shell) | 1 | Soft-duplicate of www / slash / thin homepage-like shell |
| `https://www.oilandgasclub.com/instrumentation-design-course` | `https://oilandgasclub.com/instrumentation-design-course` | **200** (should be **301**) | Empty shell | 1 (points to apex) | **Classic host mismatch:** www 200 + apex canonical |
| `https://oilandgasclub.com/blog` | `https://oilandgasclub.com/blog` | **200** | Empty shell | 1 | Soft-duplicate of www / slash / thin listing |

---

## 2. Duplicate variants found

### Host / protocol
- `https://www.oilandgasclub.com/{events|blog|instrumentation-design-course}` → **200** (must be **301 → apex**)
- `http://oilandgasclub.com/events` → **301 → https** (good)
- `http://www.oilandgasclub.com/events` → **404** (broken; should 301)

### Trailing slash
- `/events/`, `/blog/`, `/instrumentation-design-course/` → **200** (must 301 strip slash)

### Course aliases
- Official public route (from Angular + sitemap + API slug): **`/:slug`** = `/instrumentation-design-course`
- `/course/instrumentation-design-course` → **301 → /:slug`** (good)
- `/courses/instrumentation-design-course` → **200 homepage shell, 0 canonical** (must Express 301)

### Legacy blog hosts
- `blog.oilandgasclub.com` / `www.blog.oilandgasclub.com` → **502** (must 301; root → `/blog`)

---

## 3. Content similarity (main body)

| Pair | Similarity (main body) | Notes |
|---|---|---|
| `/events` vs www `/events` | ~100% | Identical thin shells |
| `/events` vs `/events/` | ~100% | Identical |
| `/events` vs homepage | High template overlap; body empty | Meta-only shells share chrome; no unique listing HTML |
| `/blog` vs www `/blog` | ~100% | Identical thin shells |
| Course apex vs www course | ~100% | Identical thin shells |
| `/courses/:slug` vs homepage | Very high | Homepage title, no course H1 |

Empty shells share ~identical non-content chrome; Google cannot trust self-canonicals when alternate hosts also 200.

---

## 4. Root causes

1. **Nginx www → apex 301 not live** (or www vhost proxies to SSR). Express had no www Host safety-net → both hosts **200**.
2. **Trailing-slash strip not effective in production** (old build / CDN / order) → slash variants **200**.
3. **Empty Angular SSR `app-root`** on public pages (`X-OGC-SSR: stream|cache`) — meta injected by seo-shell only; listing hubs previously got meta without body.
4. **`/courses/:slug` client-only navigate** — soft-200 homepage duplicate.
5. **Internal links** still pointed at `blog.oilandgasclub.com` (footer / guest blogging).
6. **Payment success domain** in `EventService` hardcoded `www`.

---

## 5. Files responsible (pre-fix)

| Area | Files |
|---|---|
| www / blog host redirects | `docs/nginx-ssr-production.example.conf`, missing Express www middleware |
| Course alias | `create-production-server.ts` (`/course` only), `redirect-courses-to-slug.component.ts` |
| Empty SSR | SSR env `PUBLIC_API_URL`/`SSR_API_URL`, `ssr-catch-all.ts`, `server.seo-shell.ts` |
| Hub SEO gaps | `events.component.ts`, `blog-list.component.ts` |
| Internal links | `public-footer.component.html`, `guest-blogging.component.html` |
| Backend www | `EventService.cs` |

---

## 6. Proposed actions (implemented in code; **not live until deploy**)

1. Express `registerWwwCanonicalRedirect` + keep `registerLegacyBlogHostRedirect` (blog root → `/blog`).
2. Express **301 `/courses/:slug` → `/:slug`**.
3. Unique SSR SEO + H1/intro + breadcrumbs for `/events` and `/blog`.
4. seo-shell: inject listing **body** + CollectionPage/Blog JSON-LD when `app-root` empty.
5. Force apex origin in seo-shell `pageOriginAndUrl`.
6. Fix footer/guest-blogging → `/blog`; EventService → non-www.
7. Nginx: split elearn vs blog; blog `/` → `/blog`; exclude `www` from tenant regex.
8. Deploy SSR with working `PUBLIC_API_URL`, flush HTML/CDN caches, apply nginx, re-verify with curl.

---

## 7. Sitemap (pre-change)

Sitemap already lists apex `/events`, `/blog`, and course slugs (non-www). Do **not** add www or `/courses/:slug`. After deploy, validate each loc returns 200, self-canonical, non-empty SSR body.

---

## 8. Production verification gate (do not claim GSC fixed until)

```bash
curl -sI https://www.oilandgasclub.com/instrumentation-design-course
# Expect: 301 Location: https://oilandgasclub.com/instrumentation-design-course

curl -s https://oilandgasclub.com/events | grep -Ei '<title|canonical|<h1|CollectionPage|Event'
curl -s https://oilandgasclub.com/blog | grep -Ei '<title|canonical|<h1|CollectionPage|Blog'
curl -IL --max-redirs 5 https://www.blog.oilandgasclub.com/
curl -s https://oilandgasclub.com/sitemap.xml | head
```

All four must agree for each hub/course: **SSR canonical = hydrated canonical = sitemap loc = final redirect URL**.
