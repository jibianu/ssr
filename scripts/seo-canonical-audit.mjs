#!/usr/bin/env node
/**
 * Canonical consolidation audit (GSC: "Duplicate, Google chose different canonical").
 *
 * Captures status, redirect chain, SSR sizes, H1/title/canonical/robots for the
 * reported URLs + variants. Writes CSV under scripts/seo-reports/.
 *
 * Usage:
 *   node scripts/seo-canonical-audit.mjs
 *   BASE_URL=http://localhost:4000 node scripts/seo-canonical-audit.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.env.BASE_URL || 'https://oilandgasclub.com').replace(/\/+$/, '');
const ORIGIN = 'https://oilandgasclub.com';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'seo-reports');

const URLS = [
  `${ORIGIN}/events`,
  'http://oilandgasclub.com/events',
  'http://www.oilandgasclub.com/events',
  'https://www.oilandgasclub.com/events',
  `${ORIGIN}/events/`,
  'https://www.oilandgasclub.com/events/',
  `${ORIGIN}/blog`,
  'https://www.oilandgasclub.com/blog',
  `${ORIGIN}/blog/`,
  'https://blog.oilandgasclub.com/',
  'https://www.blog.oilandgasclub.com/',
  `${ORIGIN}/instrumentation-design-course`,
  'https://www.oilandgasclub.com/instrumentation-design-course',
  `${ORIGIN}/instrumentation-design-course/`,
  'https://www.oilandgasclub.com/instrumentation-design-course/',
  `${ORIGIN}/course/instrumentation-design-course`,
  `${ORIGIN}/courses/instrumentation-design-course`,
];

// When BASE is local, also probe local paths only (skip foreign hosts).
const targets =
  BASE === ORIGIN
    ? URLS
    : [
        `${BASE}/events`,
        `${BASE}/events/`,
        `${BASE}/blog`,
        `${BASE}/blog/`,
        `${BASE}/instrumentation-design-course`,
        `${BASE}/instrumentation-design-course/`,
        `${BASE}/course/instrumentation-design-course`,
        `${BASE}/courses/instrumentation-design-course`,
        // Simulate www Host against local SSR
      ];

const MAX_HOPS = 8;

async function fetchManual(url, extraHeaders = {}) {
  return fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': 'seo-canonical-audit/1.0', ...extraHeaders },
  });
}

async function follow(startUrl, extraHeaders = {}) {
  const chain = [];
  let url = startUrl;
  for (let i = 0; i <= MAX_HOPS; i++) {
    let res;
    try {
      res = await fetchManual(url, extraHeaders);
    } catch (e) {
      chain.push({ url, status: 0, location: null, error: String(e) });
      return { chain, finalHtml: '', finalHeaders: new Headers() };
    }
    const loc = res.headers.get('location');
    chain.push({ url, status: res.status, location: loc, headers: res.headers });
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).href;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return { chain, finalHtml: buf.toString('utf8'), finalHeaders: res.headers, bytes: buf.length };
  }
  return { chain, finalHtml: '', finalHeaders: new Headers() };
}

function extract(re, html) {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function appRootInner(html) {
  const m = html.match(/<app-root\b[^>]*>([\s\S]*?)<\/app-root>/i);
  if (!m) return 0;
  const inner = m[1].replace(/<!--[\s\S]*?-->/g, '').trim();
  return inner.length;
}

function wordCount(html) {
  const m = html.match(/<app-root\b[^>]*>([\s\S]*?)<\/app-root>/i);
  const text = (m ? m[1] : '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').filter(Boolean).length : 0;
}

function shellKind(html, appLen) {
  if (!html) return 'n/a';
  if (appLen < 80) return 'empty-shell';
  if (/ogc-ssr-crawler-content/i.test(html)) return 'seo-shell-body';
  return 'full-or-partial-ssr';
}

async function loadSitemap() {
  try {
    const res = await fetch(`${BASE}/sitemap.xml`, { headers: { 'User-Agent': 'seo-canonical-audit/1.0' } });
    if (!res.ok) return new Set();
    const xml = await res.text();
    return new Set([...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].trim()));
  } catch {
    return new Set();
  }
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const sitemap = await loadSitemap();
  const rows = [];

  for (const url of targets) {
    const { chain, finalHtml, finalHeaders, bytes } = await follow(url);
    const last = chain[chain.length - 1] || {};
    const hops = Math.max(0, chain.length - 1);
    const finalUrl = last.url || url;
    const finalStatus = last.status || 0;
    const htmlLen = bytes ?? Buffer.byteLength(finalHtml || '', 'utf8');
    const appLen = appRootInner(finalHtml || '');
    const words = wordCount(finalHtml || '');
    const title = extract(/<title[^>]*>([\s\S]*?)<\/title>/i, finalHtml || '').replace(/\s+/g, ' ');
    const h1 = extract(/<h1[^>]*>([\s\S]*?)<\/h1>/i, finalHtml || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    const cans = [...(finalHtml || '').matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi)];
    const canonical =
      cans.map((m) => extract(/href=["']([^"']+)["']/i, m[0])).filter(Boolean)[0] || '';
    const robots = extract(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i, finalHtml || '')
      || extract(/content=["']([^"']+)["'][^>]*name=["']robots["']/i, finalHtml || '');
    const desc = extract(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i, finalHtml || '');
    const xRobots = finalHeaders.get?.('x-robots-tag') || '';
    const xSsr = finalHeaders.get?.('x-ogc-ssr') || '';
    const pathCanon = finalUrl.replace(/[?#].*$/, '').replace(/\/+$/, '') || finalUrl;
    const inSitemap = [...sitemap].some((u) => u.replace(/\/+$/, '') === pathCanon.replace(/\/+$/, ''));
    const shell = shellKind(finalHtml || '', appLen);

    const expectsWwwRedirect = /\/\/www\./i.test(url) || /\/\/blog\./i.test(url);
    const expectsSlashRedirect = /\/$/.test(new URL(url).pathname) && new URL(url).pathname !== '/';
    const expectsCourseAlias = /\/courses?\//i.test(url);

    let pass = 'FAIL';
    if (expectsWwwRedirect || expectsSlashRedirect || expectsCourseAlias) {
      pass = hops === 1 && finalStatus === 200 && !/\/\/www\./i.test(finalUrl) ? 'PASS' : 'FAIL';
      if (/blog\./i.test(url) && hops >= 1 && /\/blog\/?$/.test(finalUrl.replace(/\/+$/, '') + '') && finalStatus === 200) {
        // blog root → /blog
        pass = finalUrl.includes('/blog') ? 'PASS' : pass;
      }
    } else if (finalStatus === 200 && hops === 0) {
      const selfCanon = canonical === `${ORIGIN}${new URL(url).pathname}`.replace(/\/+$/, '') ||
        canonical === url.replace(/\/+$/, '');
      pass = appLen > 200 && cans.length === 1 && selfCanon ? 'PASS' : 'FAIL';
    }

    rows.push({
      originalUrl: url,
      initialStatus: chain[0]?.status ?? 0,
      redirectChain: chain.map((c) => `${c.status}${c.location ? '->' + c.location : ''}`).join(' | '),
      hops,
      finalUrl,
      finalStatus,
      htmlLen,
      appRootLen: appLen,
      words,
      xOgcSsr: xSsr,
      title,
      h1,
      canonicalCount: cans.length,
      canonical,
      robots,
      xRobotsTag: xRobots,
      description: desc,
      sitemapPresence: inSitemap ? 'yes' : 'no',
      contentShell: shell,
      passFail: pass,
    });

    console.log(
      `${pass.padEnd(4)} ${String(chain[0]?.status).padStart(3)} hops=${hops} app=${appLen} ${url} → ${finalUrl}`
    );
  }

  // Local www Host simulation
  if (BASE !== ORIGIN) {
    const sim = await follow(`${BASE}/instrumentation-design-course`, {
      Host: 'www.oilandgasclub.com',
      'X-Forwarded-Host': 'www.oilandgasclub.com',
      'X-Forwarded-Proto': 'https',
    });
    const last = sim.chain[sim.chain.length - 1];
    console.log(
      `\n[www Host sim] status=${sim.chain[0]?.status} loc=${sim.chain[0]?.location || ''} final=${last?.url}`
    );
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const headers = Object.keys(rows[0] || { originalUrl: 1 });
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','))].join('\n');
  const out = join(OUT_DIR, 'canonical-audit.csv');
  writeFileSync(out, csv + '\n', 'utf8');
  console.log(`\nWrote ${out} (${rows.length} rows)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
