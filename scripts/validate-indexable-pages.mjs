#!/usr/bin/env node
/**
 * CI gate: every sitemap URL must be indexable (no noindex, no page-not-found
 * canonical, HTTP 200, non-empty SSR body, H1 where expected).
 *
 * Also probes the critical sample article set from GSC regressions.
 *
 * Usage:
 *   npm run seo:validate-indexable-pages
 *   FULL=1 npm run seo:validate-indexable-pages
 *   SAMPLE=80 npm run seo:validate-indexable-pages
 *
 * Writes:
 *   scripts/seo-reports/seo-valid-page-noindex-audit.csv
 *
 * Exit 1 on any failure.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || 'https://oilandgasclub.com').replace(/\/+$/, '');
const SITEMAP_URL = process.env.SITEMAP_URL || `${CANONICAL_ORIGIN}/sitemap.xml`;
const API_BASE = (process.env.PUBLIC_API_URL || process.env.SSR_API_URL || 'https://coursebackend.oilandgasclub.com').replace(
  /\/+$/,
  ''
);
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY) || 5);
const FULL = process.env.FULL === '1';
const SAMPLE = Math.max(0, Number(process.env.SAMPLE) || (FULL ? 0 : 60));
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'seo-reports');
const OUT_CSV = join(OUT_DIR, 'seo-valid-page-noindex-audit.csv');

const SAMPLE_ARTICLES = [
  `${CANONICAL_ORIGIN}/worlds-largest-refineries`,
  `${CANONICAL_ORIGIN}/stress-q-and-a`,
  `${CANONICAL_ORIGIN}/caesar-software`,
  `${CANONICAL_ORIGIN}/types-of-common-fittings`,
  `${CANONICAL_ORIGIN}/non-destructive-testing`,
  `${CANONICAL_ORIGIN}/flanges-and-types`,
  `${CANONICAL_ORIGIN}/conversion-of-units`,
  `${CANONICAL_ORIGIN}/primavera-training`,
];

const UA = 'seo-validate-indexable-pages/1.0';

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

function normalizeUrl(u) {
  try {
    const x = new URL(u);
    x.hash = '';
    x.search = '';
    let path = x.pathname.replace(/\/+$/, '') || '/';
    return `${x.origin}${path === '/' ? '/' : path}`;
  } catch {
    return u;
  }
}

async function fetchManual(url, method = 'GET') {
  return fetch(url, {
    method,
    redirect: 'manual',
    headers: {
      'User-Agent': UA,
      Accept: method === 'GET' ? 'text/html,*/*' : '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
    },
  });
}

async function apiExists(slug) {
  const url = `${API_BASE}/api/blog/${encodeURIComponent(slug)}`;
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (r.status === 404) return { exists: false, published: false };
    if (!r.ok) return { exists: null, published: null, apiStatus: r.status };
    const body = await r.json();
    const status = body?.status ?? body?.Status;
    const published =
      status === 2 ||
      status === 'Published' ||
      status === 'published' ||
      body?.isPublished === true ||
      body?.IsPublished === true ||
      !!body?.title ||
      !!body?.Title;
    return { exists: true, published: !!published, apiStatus: r.status };
  } catch {
    return { exists: null, published: null, apiStatus: 'error' };
  }
}

function classify(row) {
  if (row.pageNotFoundDetected === 'Y' || /page-not-found/i.test(row.canonical)) {
    return {
      classification: 'page-not-found-seo-leak',
      fix: 'Do not navigate to /page-not-found; keep URL + HTTP 404; flush SSR cache',
      passFail: 'FAIL',
    };
  }
  if (/noindex/i.test(row.robots) || /noindex/i.test(row.xRobots)) {
    return {
      classification: 'unexpected-noindex',
      fix: 'Reset public route robots to index,follow; check slug resolver race',
      passFail: 'FAIL',
    };
  }
  if (row.httpStatus !== 200) {
    return {
      classification: `http-${row.httpStatus}`,
      fix: row.httpStatus === 503 ? 'Transient — do not cache as 404' : 'Investigate SSR/API',
      passFail: 'FAIL',
    };
  }
  if (row.canonical && normalizeUrl(row.canonical) !== normalizeUrl(row.url)) {
    return {
      classification: 'canonical-mismatch',
      fix: 'Self-referencing canonical required',
      passFail: 'FAIL',
    };
  }
  if (Number(row.ssrBodySize) < 500 || Number(row.appRootLen) < 80) {
    return {
      classification: 'empty-ssr',
      fix: 'Do not cache empty app-root; wait for resolver',
      passFail: 'FAIL',
    };
  }
  if (row.h1Missing === 'Y') {
    return {
      classification: 'missing-h1',
      fix: 'Ensure article SSR includes H1',
      passFail: 'FAIL',
    };
  }
  if (row.soft404 === 'Y') {
    return {
      classification: 'soft-404',
      fix: 'Return real 404 or render article; never soft-200 not-found',
      passFail: 'FAIL',
    };
  }
  return { classification: 'ok', fix: '', passFail: 'PASS' };
}

async function auditUrl(url, inSitemap) {
  const row = {
    url,
    httpStatus: '',
    apiExists: '',
    published: '',
    robots: '',
    xRobots: '',
    canonical: '',
    h1: '',
    h1Missing: '',
    ssrBodySize: '',
    appRootLen: '',
    pageNotFoundDetected: '',
    soft404: '',
    cacheStatus: '',
    inSitemap: inSitemap ? 'Y' : 'N',
    classification: '',
    fix: '',
    passFail: 'FAIL',
  };

  const path = new URL(url).pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  const api = path && !path.includes('/') ? await apiExists(path) : { exists: '', published: '' };
  row.apiExists = api.exists === true ? 'Y' : api.exists === false ? 'N' : api.exists === null ? '?' : '';
  row.published = api.published === true ? 'Y' : api.published === false ? 'N' : api.published === null ? '?' : '';

  try {
    const r = await fetchManual(url, 'GET');
    row.httpStatus = r.status;
    row.xRobots = r.headers.get('x-robots-tag') || '';
    row.cacheStatus = r.headers.get('x-ogc-ssr') || r.headers.get('x-cache') || '';

    if (r.status >= 300 && r.status < 400) {
      row.classification = 'unexpected-redirect';
      row.fix = `Redirect to ${r.headers.get('location') || ''}`;
      return row;
    }

    const html = await r.text();
    row.ssrBodySize = Buffer.byteLength(html, 'utf8');
    row.appRootLen = appRootInnerLen(html);
    row.h1 = extract(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 120);
    const listingHub = ['/', '/blog', '/events', '/courses'].includes(new URL(url).pathname.replace(/\/+$/, '') || '/');
    row.h1Missing = !row.h1 && !listingHub ? 'Y' : 'N';
    row.canonical =
      extract(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i, html) ||
      extract(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i, html);
    row.robots =
      extract(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i, html) ||
      extract(/content=["']([^"']+)["'][^>]*name=["']robots["']/i, html);
    const title = extract(/<title[^>]*>([\s\S]*?)<\/title>/i, html);
    row.pageNotFoundDetected =
      /page-not-found/i.test(row.canonical) ||
      /rel=["']canonical["'][^>]*page-not-found|href=["'][^"']*page-not-found[^"']*["'][^>]*rel=["']canonical/i.test(
        html
      )
        ? 'Y'
        : 'N';
    row.soft404 =
      /page not found|404|does not exist/i.test(`${title} ${row.h1}`) ||
      (row.httpStatus === 200 && /page not found/i.test(html) && Number(row.appRootLen) < 400)
        ? 'Y'
        : 'N';

    Object.assign(row, classify(row));
  } catch (err) {
    row.classification = 'fetch-error';
    row.fix = String(err?.message || err);
    row.passFail = 'FAIL';
  }
  return row;
}

mkdirSync(OUT_DIR, { recursive: true });

const sm = await fetchManual(SITEMAP_URL, 'GET');
if (sm.status !== 200) {
  console.error(`FAIL: sitemap ${SITEMAP_URL} → HTTP ${sm.status}`);
  process.exit(1);
}
const xml = await sm.text();
const sitemapUrls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => normalizeUrl(m[1].trim()));
const sitemapSet = new Set(sitemapUrls);

let targets = [...SAMPLE_ARTICLES];
for (const u of sitemapUrls) {
  if (!targets.includes(u)) targets.push(u);
}
if (!FULL && SAMPLE > 0) {
  const must = new Set(SAMPLE_ARTICLES);
  const rest = targets.filter((u) => !must.has(u));
  targets = [...SAMPLE_ARTICLES, ...rest.slice(0, Math.max(0, SAMPLE - SAMPLE_ARTICLES.length))];
}

console.log(`Auditing ${targets.length} URLs (sitemap=${sitemapUrls.length}, full=${FULL ? 1 : 0})…`);

const rows = [];
const queue = [...targets];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const u = queue.shift();
      const row = await auditUrl(u, sitemapSet.has(u));
      rows.push(row);
      const mark = row.passFail === 'PASS' ? '✓' : '✗';
      console.log(`${mark} ${row.httpStatus} ${row.passFail} ${u} [${row.classification}]`);
    }
  })
);

const headers = [
  'URL',
  'HTTP Status',
  'API Exists',
  'Published',
  'Robots',
  'Canonical',
  'H1',
  'SSR Body Size',
  'PageNotFoundDetected',
  'CacheStatus',
  'Classification',
  'Fix',
  'PassFail',
];

const lines = [
  headers.join(','),
  ...rows.map((r) =>
    [
      r.url,
      r.httpStatus,
      r.apiExists,
      r.published,
      r.robots,
      r.canonical,
      r.h1,
      r.ssrBodySize,
      r.pageNotFoundDetected,
      r.cacheStatus,
      r.classification,
      r.fix,
      r.passFail,
    ]
      .map(csvEscape)
      .join(',')
  ),
];
writeFileSync(OUT_CSV, lines.join('\n'), 'utf8');

const fails = rows.filter((r) => r.passFail !== 'PASS');
const sampleFails = rows.filter((r) => SAMPLE_ARTICLES.includes(r.url) && r.passFail !== 'PASS');

console.log(`\nWrote ${OUT_CSV}`);
console.log(`Total: ${rows.length}  PASS: ${rows.length - fails.length}  FAIL: ${fails.length}`);
console.log(`Sample articles FAIL: ${sampleFails.length}`);

if (fails.length) {
  console.error('\nFailures:');
  for (const f of fails.slice(0, 40)) {
    console.error(` - ${f.url}: ${f.classification} — ${f.fix || f.robots || f.canonical}`);
  }
  process.exit(1);
}

console.log('All indexable-page checks passed.');
process.exit(0);
