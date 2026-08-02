# SEO indexing audit summary

Generated: 2026-08-02T13:40:06.708Z
Source: `D:\oilandgasclub\frontend\oilandgasclub\scripts\sample-indexing-urls.txt`
Sitemap: `https://oilandgasclub.com/sitemap.xml` (328 locs)
URLs audited: **11**

## Classification counts

- **D. INDEXABLE_TECHNICAL_ISSUE**: 10
- **undefined**: 1

## Critical finding

11 / 11 URLs returned an **empty `<app-root>`** in the raw HTML (meta/canonical present, no H1/body). This is the dominant "Crawled – currently not indexed" technical cause.

## Sample decisions

- `https://oilandgasclub.com/stress-q-and-a` → **D. INDEXABLE_TECHNICAL_ISSUE** / KEEP_AND_IMPROVE — SSR returns empty <app-root> / meta-only shell (crawled but not indexed)
- `https://www.blog.oilandgasclub.com/Primavera-Training` → **undefined** / undefined — undefined
- `https://oilandgasclub.com/caesar-software` → **D. INDEXABLE_TECHNICAL_ISSUE** / KEEP_AND_IMPROVE — SSR returns empty <app-root> / meta-only shell (crawled but not indexed)
- `https://oilandgasclub.com/types-of-common-fittings` → **D. INDEXABLE_TECHNICAL_ISSUE** / KEEP_AND_IMPROVE — SSR returns empty <app-root> / meta-only shell (crawled but not indexed)
- `https://oilandgasclub.com/non-destructive-testing` → **D. INDEXABLE_TECHNICAL_ISSUE** / KEEP_AND_IMPROVE — SSR returns empty <app-root> / meta-only shell (crawled but not indexed)
- `https://oilandgasclub.com/mastering-process-design` → **D. INDEXABLE_TECHNICAL_ISSUE** / KEEP_AND_IMPROVE — SSR returns empty <app-root> / meta-only shell (crawled but not indexed)
- `https://oilandgasclub.com/a-process-design-course-for-oil-and-gas-professionals` → **D. INDEXABLE_TECHNICAL_ISSUE** / KEEP_AND_IMPROVE — SSR returns empty <app-root> / meta-only shell (crawled but not indexed)
- `https://oilandgasclub.com/flanges-and-types` → **D. INDEXABLE_TECHNICAL_ISSUE** / KEEP_AND_IMPROVE — SSR returns empty <app-root> / meta-only shell (crawled but not indexed)
- `https://oilandgasclub.com/conversion-of-units` → **D. INDEXABLE_TECHNICAL_ISSUE** / KEEP_AND_IMPROVE — SSR returns empty <app-root> / meta-only shell (crawled but not indexed)
- `https://oilandgasclub.com/responsibilities-of-piping-construction-engineers` → **D. INDEXABLE_TECHNICAL_ISSUE** / KEEP_AND_IMPROVE — SSR returns empty <app-root> / meta-only shell (crawled but not indexed)
- `https://oilandgasclub.com/primavera-training` → **D. INDEXABLE_TECHNICAL_ISSUE** / KEEP_AND_IMPROVE — SSR returns empty <app-root> / meta-only shell (crawled but not indexed)

## Output files

- `seo-indexing-audit.csv`
- `seo-redirect-map.csv`
- `seo-duplicate-groups.csv`
- `seo-content-improvement-plan.csv`
- `seo-internal-link-plan.csv`
- `seo-sitemap-validation.csv`
- `seo-production-test-results.csv`
