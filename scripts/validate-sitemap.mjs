#!/usr/bin/env node
/**
 * Sitemap validation — every <loc> in sitemap.xml must resolve DIRECTLY to
 * HTTP 200 (no 3xx/4xx/5xx) and must use the canonical format
 * (https, non-www, no trailing slash). Logs every violation.
 *
 * Usage:
 *   node scripts/validate-sitemap.mjs
 *   SITEMAP_URL=http://localhost:4000/sitemap.xml node scripts/validate-sitemap.mjs
 *   CONCURRENCY=5 node scripts/validate-sitemap.mjs
 *   CHECK_CANONICAL=1 node scripts/validate-sitemap.mjs   # GET each page and
 *                       verify robots meta + self-referencing canonical (slower)
 *
 * Exit code 1 when any URL fails (CI-friendly).
 */

const SITEMAP_URL = process.env.SITEMAP_URL || 'https://oilandgasclub.com/sitemap.xml';
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY) || 8);

const res = await fetch(SITEMAP_URL, { headers: { 'User-Agent': 'sitemap-validator/1.0' } });
if (!res.ok) {
  console.error(`FAIL: sitemap fetch ${SITEMAP_URL} → HTTP ${res.status}`);
  process.exit(1);
}
const xml = await res.text();
const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].trim());
if (urls.length === 0) {
  console.error('FAIL: sitemap contains no <loc> entries');
  process.exit(1);
}
console.log(`Validating ${urls.length} sitemap URLs from ${SITEMAP_URL}\n`);

const problems = [];

const CHECK_CANONICAL = process.env.CHECK_CANONICAL === '1';

// Format checks (no network needed).
for (const u of urls) {
  if (!u.startsWith('https://')) problems.push({ url: u, reason: 'not https' });
  else if (/^https:\/\/www\./i.test(u)) problems.push({ url: u, reason: 'www host (canonical is non-www)' });
  const pathname = new URL(u).pathname;
  if (u.length > 'https://x'.length && u.endsWith('/') && pathname !== '/') {
    problems.push({ url: u, reason: 'trailing slash (canonical format has none)' });
  }
  // Canonical slugs are lowercase (except URL-encoded bytes like %20 which must not appear either).
  if (pathname !== pathname.toLowerCase()) {
    problems.push({ url: u, reason: 'uppercase characters in path (canonical slugs are lowercase)' });
  }
}

// Status checks: HEAD first (cheap), GET on 405/501 or when CHECK_CANONICAL=1.
async function check(u) {
  try {
    const method = CHECK_CANONICAL ? 'GET' : 'HEAD';
    let r = await fetch(u, { method, redirect: 'manual', headers: { 'User-Agent': 'sitemap-validator/1.0' } });
    if (r.status === 405 || r.status === 501) {
      r = await fetch(u, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': 'sitemap-validator/1.0' } });
    }
    if (r.status !== 200) {
      const loc = r.headers.get('location');
      problems.push({ url: u, reason: `HTTP ${r.status}${loc ? ` → ${loc}` : ''} (sitemap must contain only direct 200s)` });
      return;
    }
    const robotsHeader = r.headers.get('x-robots-tag') || '';
    if (robotsHeader.toLowerCase().includes('noindex')) {
      problems.push({ url: u, reason: `X-Robots-Tag noindex on sitemap URL` });
    }
    if (CHECK_CANONICAL) {
      const html = await r.text();
      const robotsMeta = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';
      if (robotsMeta.toLowerCase().includes('noindex')) {
        problems.push({ url: u, reason: `robots meta "${robotsMeta}" on sitemap URL` });
      }
      const canonical =
        html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ??
        html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1];
      if (!canonical) {
        problems.push({ url: u, reason: 'missing canonical tag' });
      } else if (canonical.replace(/\/+$/, '') !== u.replace(/\/+$/, '')) {
        problems.push({ url: u, reason: `canonical "${canonical}" is not self-referencing` });
      }
    }
  } catch (err) {
    problems.push({ url: u, reason: `fetch failed: ${err?.message || err}` });
  }
}

let done = 0;
const queue = [...urls];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const u = queue.shift();
      await check(u);
      done++;
      if (done % 50 === 0) console.log(`  …${done}/${urls.length}`);
    }
  })
);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  FAIL ${p.url}\n       ${p.reason}`);
  process.exit(1);
}
console.log(`\nOK: all ${urls.length} sitemap URLs return direct HTTP 200 in canonical format.`);
process.exit(0);
