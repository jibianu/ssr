#!/usr/bin/env node
/**
 * SEO redirect audit — tests every URL reported by Google Search Console
 * ("Page with redirect") plus canonical-format probes.
 *
 * For each URL it reports:
 *   first status, Location header, redirect hop count, final URL, final status,
 *   canonical tag, robots meta / X-Robots-Tag, sitemap presence, PASS/FAIL.
 *
 * Pass criteria:
 *   - Intentional legacy URL  → exactly one 301 hop → final 200, indexable,
 *     self-referencing canonical, source absent from sitemap.
 *   - Canonical URL           → direct 200, indexable, self-canonical, in sitemap.
 *   - Unknown URL             → 404. Removed URL → 410.
 *
 * Usage:
 *   node scripts/seo-redirect-audit.mjs                       # tests https://oilandgasclub.com
 *   BASE_URL=http://localhost:4000 node scripts/seo-redirect-audit.mjs
 *
 * Exit code 1 when any check fails (CI-friendly).
 */

const BASE = (process.env.BASE_URL || 'https://oilandgasclub.com').replace(/\/+$/, '');
const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || 'https://oilandgasclub.com').replace(/\/+$/, '');
const MAX_HOPS = 10;

/**
 * expect:
 *  'redirect-to-200'     one 301 hop → indexable 200
 *  'direct-200'          direct 200, indexable, self-canonical
 *  'noindex-200'         direct 200 with noindex,nofollow (auth/private pages);
 *                        canonical must be absent or query-free
 *  'redirect-to-noindex' one 301 hop → 200 noindex page
 *  '404' | '410'         direct status, no redirect
 */
const CASES = [
  // GSC-reported legacy /course/:slug URLs — intentional single-hop 301s.
  { url: `${BASE}/course/api-570-exam-questions-and-answers`, expect: 'redirect-to-200' },
  { url: `${BASE}/course/intools-training`, expect: 'redirect-to-200' },
  { url: `${BASE}/course/api-936-refractory-personnel-exam-questions`, expect: 'redirect-to-200' },
  { url: `${BASE}/course/primavera-training`, expect: 'redirect-to-200' },
  { url: `${BASE}/course/api-571-certified-corrosion-and-materials-specialist`, expect: 'redirect-to-200' },
  { url: `${BASE}/course/mastering-asnt-ndt-level-iii-key-concepts-and-practice-questions`, expect: 'redirect-to-200' },
  { url: `${BASE}/course/api-653-above-ground-storage-tank-inspector`, expect: 'redirect-to-200' },
  { url: `${BASE}/course/pipenet-training`, expect: 'redirect-to-200' },
  // GSC-reported trailing-slash URL — must strip in one hop.
  { url: `${BASE}/worlds-largest-refineries/`, expect: 'redirect-to-200' },
  // www + trailing slash — must reach canonical URL (ideally one hop via nginx).
  // Only testable against production (www host doesn't exist locally).
  ...(BASE === CANONICAL_ORIGIN
    ? [{ url: `https://www.oilandgasclub.com/affiliate-program/`, expect: 'redirect-to-200' }]
    : []),
  // Canonical pages — must be direct 200, no redirect.
  { url: `${BASE}/affiliate-program`, expect: 'direct-200' },
  { url: `${BASE}/pipenet-training`, expect: 'direct-200' },
  // Unknown URL — real 404, no homepage redirect.
  { url: `${BASE}/this-page-never-existed-xyz-12345`, expect: '404' },

  // --- "Duplicate without user-selected canonical" (GSC) ---
  // Canonical category pages: direct 200 with lowercase self-canonical.
  { url: `${BASE}/category/process`, expect: 'direct-200' },
  { url: `${BASE}/category/piping-design`, expect: 'direct-200' },
  { url: `${BASE}/category/instrumentation-design`, expect: 'direct-200' },
  // Variants: one direct 301 to the canonical category slug.
  { url: `${BASE}/category/Process`, expect: 'redirect-to-200' },
  { url: `${BASE}/category/Structural`, expect: 'redirect-to-200' },
  { url: `${BASE}/category/instrumentation`, expect: 'redirect-to-200' },
  // Auth pages: 200 + noindex,nofollow, no query-based canonical, not in sitemap.
  { url: `${BASE}/login`, expect: 'noindex-200' },
  {
    url: `${BASE}/login?returnUrl=/app/student/course/818982d9-277c-406b-8598-187d4918f768`,
    expect: 'noindex-200',
  },
  { url: `${BASE}/forget-password`, expect: 'noindex-200' },
  // Alternate spelling: one 301 to the real route (which is noindex).
  { url: `${BASE}/forgot-password`, expect: 'redirect-to-noindex' },
  // Production-only checks (hosts don't exist locally).
  ...(BASE === CANONICAL_ORIGIN
    ? [
        { url: `https://www.oilandgasclub.com/category/process`, expect: 'redirect-to-200' },
        // GSC: "Duplicate, Google chose different canonical than user"
        { url: `https://www.oilandgasclub.com/events`, expect: 'redirect-to-200' },
        { url: `https://www.oilandgasclub.com/blog`, expect: 'redirect-to-200' },
        { url: `https://www.oilandgasclub.com/instrumentation-design-course`, expect: 'redirect-to-200' },
        { url: `https://www.oilandgasclub.com/api-570-exam-questions-and-answers`, expect: 'redirect-to-200' },
        { url: `https://www.oilandgasclub.com/sitemap.xml`, expect: 'redirect-to-200' },
        { url: `https://blog.oilandgasclub.com/`, expect: 'redirect-to-200' },
        { url: `https://www.blog.oilandgasclub.com/`, expect: 'redirect-to-200' },
        // Company tenant portal — must answer noindex (Case C: private application).
        { url: `https://anu.oilandgasclub.com/`, expect: 'noindex-200' },
      ]
    : []),
  // Hub pages — direct 200, self-canonical (trailing slash must 301 locally via Express).
  { url: `${BASE}/events`, expect: 'direct-200' },
  { url: `${BASE}/events/`, expect: 'redirect-to-200' },
  { url: `${BASE}/blog`, expect: 'direct-200' },
  { url: `${BASE}/blog/`, expect: 'redirect-to-200' },
  { url: `${BASE}/instrumentation-design-course`, expect: 'direct-200' },
  { url: `${BASE}/instrumentation-design-course/`, expect: 'redirect-to-200' },
  { url: `${BASE}/course/instrumentation-design-course`, expect: 'redirect-to-200' },
  { url: `${BASE}/courses/instrumentation-design-course`, expect: 'redirect-to-200' },
  { url: `${BASE}/api-570-exam-questions-and-answers`, expect: 'direct-200' },
];

async function fetchNoRedirect(url) {
  return fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'seo-redirect-audit/1.0' } });
}

async function followChain(startUrl) {
  const hops = [];
  let url = startUrl;
  for (let i = 0; i <= MAX_HOPS; i++) {
    const res = await fetchNoRedirect(url);
    const loc = res.headers.get('location');
    hops.push({ url, status: res.status, location: loc, res });
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).href;
      continue;
    }
    return hops;
  }
  return hops; // loop / too many hops
}

function extract(re, html) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

async function loadSitemap() {
  try {
    const res = await fetch(`${BASE}/sitemap.xml`, { headers: { 'User-Agent': 'seo-redirect-audit/1.0' } });
    if (!res.ok) return { ok: false, urls: new Set() };
    const xml = await res.text();
    const urls = new Set([...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].trim()));
    return { ok: true, urls };
  } catch {
    return { ok: false, urls: new Set() };
  }
}

function normalizeForSitemap(url) {
  // Sitemap uses the canonical origin; a local BASE_URL still maps onto it.
  const u = new URL(url);
  return `${CANONICAL_ORIGIN}${u.pathname.replace(/\/+$/, '') || '/'}`;
}

const results = [];
const sitemap = await loadSitemap();

for (const c of CASES) {
  const row = {
    source: c.url,
    expect: c.expect,
    firstStatus: null,
    location: null,
    redirects: 0,
    finalUrl: null,
    finalStatus: null,
    canonical: null,
    robots: null,
    sourceInSitemap: null,
    finalInSitemap: null,
    pass: false,
    notes: [],
  };
  try {
    const hops = await followChain(c.url);
    const first = hops[0];
    const last = hops[hops.length - 1];
    row.firstStatus = first.status;
    row.location = first.location;
    row.redirects = hops.length - 1;
    row.finalUrl = last.url;
    row.finalStatus = last.status;
    row.sourceInSitemap = sitemap.urls.has(normalizeForSitemap(c.url));
    row.finalInSitemap = sitemap.urls.has(normalizeForSitemap(last.url));

    if (last.status === 200) {
      const html = await last.res.text();
      row.canonical = extract(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i, html)
        ?? extract(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i, html);
      row.robots = extract(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i, html)
        ?? last.res.headers.get('x-robots-tag');
    }

    switch (c.expect) {
      case 'redirect-to-200': {
        const singleHop = row.redirects === 1;
        const permanent = first.status === 301 || first.status === 308;
        const final200 = last.status === 200;
        const indexable = !(row.robots || '').toLowerCase().includes('noindex');
        const selfCanonical =
          !row.canonical ||
          row.canonical.replace(/\/+$/, '') === normalizeForSitemap(last.url).replace(CANONICAL_ORIGIN, CANONICAL_ORIGIN);
        const expectedCanonical = normalizeForSitemap(last.url);
        const canonicalOk = !row.canonical || row.canonical.replace(/\/+$/, '') === expectedCanonical;
        if (!permanent) row.notes.push(`first status ${first.status}, want 301/308`);
        if (!singleHop) row.notes.push(`${row.redirects} hops, want 1`);
        if (!final200) row.notes.push(`final ${last.status}, want 200`);
        if (!indexable) row.notes.push(`final noindex: ${row.robots}`);
        if (!canonicalOk) row.notes.push(`canonical ${row.canonical} ≠ ${expectedCanonical}`);
        if (row.sourceInSitemap) row.notes.push('source URL present in sitemap');
        row.pass = permanent && singleHop && final200 && indexable && canonicalOk && !row.sourceInSitemap && selfCanonical;
        break;
      }
      case 'direct-200': {
        const direct = row.redirects === 0 && last.status === 200;
        const indexable = !(row.robots || '').toLowerCase().includes('noindex');
        const expectedCanonical = normalizeForSitemap(c.url);
        const canonicalOk = row.canonical && row.canonical.replace(/\/+$/, '') === expectedCanonical;
        if (!direct) row.notes.push(`redirects=${row.redirects} status=${last.status}, want direct 200`);
        if (!indexable) row.notes.push(`noindex: ${row.robots}`);
        if (!canonicalOk) row.notes.push(`canonical ${row.canonical} ≠ ${expectedCanonical}`);
        row.pass = direct && indexable && Boolean(canonicalOk);
        break;
      }
      case 'noindex-200': {
        const direct = row.redirects === 0 && last.status === 200;
        const robots = (row.robots || '').toLowerCase();
        const noindexed = robots.includes('noindex') && robots.includes('nofollow');
        const canonicalClean = !row.canonical || !row.canonical.includes('?');
        if (!direct) row.notes.push(`redirects=${row.redirects} status=${last.status}, want direct 200`);
        if (!noindexed) row.notes.push(`robots "${row.robots}" — want noindex,nofollow`);
        if (!canonicalClean) row.notes.push(`canonical carries query params: ${row.canonical}`);
        if (row.sourceInSitemap) row.notes.push('private URL present in sitemap');
        row.pass = direct && noindexed && canonicalClean && !row.sourceInSitemap;
        break;
      }
      case 'redirect-to-noindex': {
        const singleHop = row.redirects === 1;
        const permanent = first.status === 301 || first.status === 308;
        const final200 = last.status === 200;
        const robots = (row.robots || '').toLowerCase();
        const noindexed = robots.includes('noindex');
        if (!permanent) row.notes.push(`first status ${first.status}, want 301/308`);
        if (!singleHop) row.notes.push(`${row.redirects} hops, want 1`);
        if (!final200) row.notes.push(`final ${last.status}, want 200`);
        if (!noindexed) row.notes.push(`final robots "${row.robots}" — want noindex`);
        row.pass = permanent && singleHop && final200 && noindexed;
        break;
      }
      case '404':
      case '410': {
        const want = Number(c.expect);
        if (last.status !== want) row.notes.push(`final ${last.status}, want ${want}`);
        if (row.redirects > 0) row.notes.push(`redirected ${row.redirects}× — soft-404 redirect`);
        row.pass = last.status === want && row.redirects === 0;
        break;
      }
    }
  } catch (err) {
    row.notes.push(`fetch failed: ${err?.message || err}`);
  }
  results.push(row);
}

// --- Report ---
const pad = (s, n) => String(s ?? '—').padEnd(n).slice(0, n);
console.log(`\nSEO redirect audit — base ${BASE} (sitemap ${sitemap.ok ? `${sitemap.urls.size} URLs` : 'UNAVAILABLE'})\n`);
console.log(
  pad('RESULT', 7) + pad('FIRST', 6) + pad('HOPS', 5) + pad('FINAL', 6) + pad('SOURCE', 70) + 'NOTES'
);
for (const r of results) {
  console.log(
    pad(r.pass ? 'PASS' : 'FAIL', 7) +
      pad(r.firstStatus, 6) +
      pad(r.redirects, 5) +
      pad(r.finalStatus, 6) +
      pad(r.source.replace(BASE, ''), 70) +
      (r.notes.join('; ') || '')
  );
  if (r.location) console.log(`       → ${r.location}`);
  if (r.canonical) console.log(`       canonical: ${r.canonical}${r.robots ? `   robots: ${r.robots}` : ''}`);
}
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
