#!/usr/bin/env node
/**
 * Sitemap validation — every <loc> must use https://oilandgasclub.com,
 * return direct HTTP 200, self-canonical, indexable, non-empty SSR body.
 *
 * Usage:
 *   node scripts/validate-sitemap.mjs
 *   SITEMAP_URL=http://localhost:4000/sitemap.xml node scripts/validate-sitemap.mjs
 *   CONCURRENCY=5 SAMPLE=50 node scripts/validate-sitemap.mjs
 *   FULL=1 node scripts/validate-sitemap.mjs   # GET every URL (slow)
 *
 * Writes:
 *   scripts/seo-reports/seo-sitemap-validation.csv
 *   scripts/seo-reports/seo-sitemap-validation-summary.md
 *
 * Exit 1 when any invalid entry is found.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || 'https://oilandgasclub.com').replace(/\/+$/, '');
const SITEMAP_URL = process.env.SITEMAP_URL || `${CANONICAL_ORIGIN}/sitemap.xml`;
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY) || 6);
const FULL = process.env.FULL === '1';
const SAMPLE = Math.max(0, Number(process.env.SAMPLE) || (FULL ? 0 : 40));
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'seo-reports');

const UA = 'sitemap-validator/2.0';

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function extract(re, html) {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function appRootInnerLen(html) {
  const m = html.match(/<app-root\b[^>]*>([\s\S]*?)<\/app-root>/i);
  if (!m) return 0;
  return m[1].replace(/<!--[\s\S]*?-->/g, '').trim().length;
}

function isEmptyShell(html, appLen) {
  if (appLen < 80) return true;
  if (/<app-root\b[^>]*>\s*(?:<!--[\s\S]*?-->)?\s*<\/app-root>/i.test(html) && appLen < 80) return true;
  return false;
}

function isSoft404(html, title, h1) {
  const t = `${title} ${h1}`.toLowerCase();
  if (/page not found|404|does not exist|couldn't find/i.test(t)) return true;
  if (/ogc-ssr-crawler-content/i.test(html) && appRootInnerLen(html) < 120) return true;
  return false;
}

async function fetchManual(url, method = 'GET') {
  return fetch(url, {
    method,
    redirect: 'manual',
    headers: { 'User-Agent': UA, Accept: method === 'GET' ? 'text/html,application/xml,*/*' : '*/*' },
  });
}

const res = await fetchManual(SITEMAP_URL, 'GET');
if (res.status !== 200) {
  console.error(`FAIL: sitemap fetch ${SITEMAP_URL} → HTTP ${res.status}`);
  process.exit(1);
}
const xml = await res.text();
const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].trim());
if (urls.length === 0) {
  console.error('FAIL: sitemap contains no <loc> entries');
  process.exit(1);
}

const seen = new Set();
const duplicates = [];
for (const u of urls) {
  const key = u.replace(/\/+$/, '');
  if (seen.has(key)) duplicates.push(u);
  seen.add(key);
}

console.log(`Validating ${urls.length} sitemap URLs from ${SITEMAP_URL}`);
console.log(`Canonical origin: ${CANONICAL_ORIGIN}`);
console.log(`Mode: ${FULL ? 'FULL GET all' : `format+status all, deep GET sample=${SAMPLE || 'all'}`}\n`);

const rows = [];
const problems = [];

function fail(url, reason, extra = {}) {
  problems.push({ url, reason });
  return { ...extra, passFail: 'FAIL', notes: reason };
}

// Format + uniqueness
for (const u of urls) {
  const base = {
    url: u,
    initialStatus: '',
    location: '',
    finalStatus: '',
    htmlLen: 0,
    appRootLen: 0,
    h1: '',
    title: '',
    canonicalCount: 0,
    canonical: '',
    robots: '',
    xRobots: '',
    sitemapHostOk: 'yes',
    trailingSlashOk: 'yes',
    caseOk: 'yes',
    passFail: 'PASS',
    notes: '',
  };

  if (!u.startsWith('https://')) {
    rows.push(fail(u, 'not https', { ...base, sitemapHostOk: 'no' }));
    continue;
  }
  if (!u.startsWith(`${CANONICAL_ORIGIN}/`) && u !== `${CANONICAL_ORIGIN}/` && u !== CANONICAL_ORIGIN) {
    rows.push(fail(u, `host is not ${CANONICAL_ORIGIN}`, { ...base, sitemapHostOk: 'no' }));
    continue;
  }
  if (/^https:\/\/www\./i.test(u)) {
    rows.push(fail(u, 'www host (canonical is non-www)', { ...base, sitemapHostOk: 'no' }));
    continue;
  }
  try {
    const pathname = new URL(u).pathname;
    if (u.endsWith('/') && pathname !== '/') {
      rows.push(fail(u, 'trailing slash (canonical format has none)', { ...base, trailingSlashOk: 'no' }));
      continue;
    }
    if (pathname !== pathname.toLowerCase()) {
      rows.push(fail(u, 'uppercase characters in path', { ...base, caseOk: 'no' }));
      continue;
    }
  } catch (e) {
    rows.push(fail(u, `invalid URL: ${e.message}`, base));
    continue;
  }
  rows.push(base);
}

for (const d of duplicates) {
  problems.push({ url: d, reason: 'duplicate <loc> in sitemap' });
  const row = rows.find((r) => r.url === d);
  if (row) {
    row.passFail = 'FAIL';
    row.notes = (row.notes ? row.notes + '; ' : '') + 'duplicate <loc>';
  }
}

const formatOk = rows.filter((r) => r.passFail === 'PASS').map((r) => r.url);
const deepTargets =
  FULL || SAMPLE === 0
    ? formatOk
    : formatOk.filter((_, i) => i < SAMPLE || i % Math.max(1, Math.floor(formatOk.length / SAMPLE)) === 0).slice(0, Math.max(SAMPLE, 1));

async function checkStatusAndOptionalDeep(u, deep) {
  const row = rows.find((r) => r.url === u);
  if (!row || row.passFail === 'FAIL' && row.sitemapHostOk === 'no') return;

  try {
    let r = await fetchManual(u, deep ? 'GET' : 'HEAD');
    if (r.status === 405 || r.status === 501) {
      r = await fetchManual(u, 'GET');
      deep = true;
    }
    row.initialStatus = r.status;
    row.location = r.headers.get('location') || '';
    row.xRobots = r.headers.get('x-robots-tag') || '';

    if (r.status !== 200) {
      Object.assign(
        row,
        fail(u, `HTTP ${r.status}${row.location ? ` → ${row.location}` : ''} (sitemap must contain only direct 200s)`, {
          finalStatus: r.status,
        })
      );
      return;
    }
    row.finalStatus = 200;
    if (row.xRobots.toLowerCase().includes('noindex')) {
      Object.assign(row, fail(u, 'X-Robots-Tag noindex on sitemap URL'));
      return;
    }

    if (!deep) return;

    const html = await r.text();
    row.htmlLen = Buffer.byteLength(html, 'utf8');
    row.appRootLen = appRootInnerLen(html);
    row.title = extract(/<title[^>]*>([\s\S]*?)<\/title>/i, html).replace(/\s+/g, ' ');
    row.h1 = extract(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    const cans = [...html.matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi)];
    row.canonicalCount = cans.length;
    row.canonical =
      cans.map((m) => extract(/href=["']([^"']+)["']/i, m[0])).filter(Boolean)[0] || '';
    row.robots =
      extract(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i, html) ||
      extract(/content=["']([^"']+)["'][^>]*name=["']robots["']/i, html);

    if (row.robots.toLowerCase().includes('noindex')) {
      Object.assign(row, fail(u, `robots meta "${row.robots}"`));
      return;
    }
    if (row.canonicalCount !== 1) {
      Object.assign(row, fail(u, `canonical count ${row.canonicalCount} (want 1)`));
      return;
    }
    if (row.canonical.replace(/\/+$/, '') !== u.replace(/\/+$/, '')) {
      Object.assign(row, fail(u, `canonical "${row.canonical}" ≠ sitemap URL`));
      return;
    }
    if (isEmptyShell(html, row.appRootLen)) {
      Object.assign(row, fail(u, `empty app-root (inner=${row.appRootLen})`));
      return;
    }
    // Listing hubs may use visually styled titles; require H1 for article/course-like paths.
    const pathOnly = new URL(u).pathname.replace(/\/+$/, '') || '/';
    const listingHub = pathOnly === '/' || pathOnly === '/courses' || pathOnly === '/blog' || pathOnly === '/events';
    if (!row.h1 && !listingHub) {
      Object.assign(row, fail(u, 'missing H1'));
      return;
    }
    if (isSoft404(html, row.title, row.h1)) {
      Object.assign(row, fail(u, 'soft 404 signals'));
      return;
    }
  } catch (err) {
    Object.assign(row, fail(u, `fetch failed: ${err?.message || err}`));
  }
}

// Status check all format-ok URLs (HEAD)
const statusQueue = [...formatOk];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (statusQueue.length) {
      const u = statusQueue.shift();
      await checkStatusAndOptionalDeep(u, false);
    }
  })
);

// Deep GET sample / full
const deepQueue = deepTargets.filter((u) => {
  const row = rows.find((r) => r.url === u);
  return row && row.passFail === 'PASS' && row.finalStatus === 200;
});
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (deepQueue.length) {
      const u = deepQueue.shift();
      await checkStatusAndOptionalDeep(u, true);
    }
  })
);

mkdirSync(OUT_DIR, { recursive: true });
const headers = [
  'url',
  'initialStatus',
  'location',
  'finalStatus',
  'htmlLen',
  'appRootLen',
  'h1',
  'title',
  'canonicalCount',
  'canonical',
  'robots',
  'xRobots',
  'sitemapHostOk',
  'trailingSlashOk',
  'caseOk',
  'passFail',
  'notes',
];
const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','))].join('\n');
writeFileSync(join(OUT_DIR, 'seo-sitemap-validation.csv'), csv + '\n', 'utf8');

const failCount = problems.length;
const summary = `# Sitemap validation summary

- Sitemap: \`${SITEMAP_URL}\`
- Canonical origin: \`${CANONICAL_ORIGIN}\`
- Loc count: **${urls.length}**
- Duplicate locs: **${duplicates.length}**
- Deep GET checked: **${deepTargets.length}**
- Problems: **${failCount}**

## Live host checks (run separately)

\`\`\`bash
curl -sI https://www.oilandgasclub.com/sitemap.xml
# Expect: 301 Location: https://oilandgasclub.com/sitemap.xml

curl -sI https://oilandgasclub.com/sitemap.xml
# Expect: 200 application/xml
\`\`\`

## Failures

${
  failCount
    ? problems
        .slice(0, 80)
        .map((p) => `- \`${p.url}\` — ${p.reason}`)
        .join('\n')
    : '_None._'
}

${failCount > 80 ? `\n…and ${failCount - 80} more (see CSV).\n` : ''}
`;
writeFileSync(join(OUT_DIR, 'seo-sitemap-validation-summary.md'), summary, 'utf8');

console.log(`\nWrote ${join(OUT_DIR, 'seo-sitemap-validation.csv')}`);
console.log(`Wrote ${join(OUT_DIR, 'seo-sitemap-validation-summary.md')}`);

if (failCount) {
  console.error(`\n${failCount} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error(`  FAIL ${p.url}\n       ${p.reason}`);
  if (failCount > 40) console.error(`  …${failCount - 40} more`);
  process.exit(1);
}
console.log(`\nOK: sitemap format + status checks passed (${urls.length} locs).`);
process.exit(0);
