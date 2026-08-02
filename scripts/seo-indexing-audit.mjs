#!/usr/bin/env node
/**
 * Bulk "Crawled - currently not indexed" audit tool.
 *
 * Usage:
 *   node scripts/seo-indexing-audit.mjs --urls scripts/sample-indexing-urls.txt
 *   node scripts/seo-indexing-audit.mjs --urls gsc-urls.csv --sitemap https://oilandgasclub.com/sitemap.xml
 *   BASE_URL=https://oilandgasclub.com node scripts/seo-indexing-audit.mjs --urls …
 *
 * Outputs (under scripts/seo-reports/ by default):
 *   seo-indexing-audit.csv
 *   seo-indexing-audit-summary.md
 *   seo-redirect-map.csv
 *   seo-duplicate-groups.csv
 *   seo-content-improvement-plan.csv
 *   seo-internal-link-plan.csv
 *   seo-sitemap-validation.csv
 *   seo-production-test-results.csv
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(process.env.OUT_DIR || join(__dirname, 'seo-reports'));
const CANONICAL_ORIGIN = 'https://oilandgasclub.com';
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) OGC-IndexingAudit/1.0';

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const URLS_FILE = resolve(arg('urls', join(__dirname, 'sample-indexing-urls.txt')));
const SITEMAP_URL = arg('sitemap', process.env.SITEMAP_URL || `${CANONICAL_ORIGIN}/sitemap.xml`);
const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '4', 10));

/** Soft-404 / thin shell phrases Google often sees when SSR fails. */
const SOFT_404_MARKERS = [
  'page not found',
  'blog post not found',
  'no content available',
  'loading...',
  'service temporarily unavailable',
];

function parseUrlList(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`URL list not found: ${filePath}`);
  }
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const urls = [];
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    // CSV: take first column if it looks like a URL
    const first = line.split(',')[0].trim().replace(/^"|"$/g, '');
    if (/^https?:\/\//i.test(first)) urls.push(first);
    else if (first.startsWith('/')) urls.push(`${CANONICAL_ORIGIN}${first}`);
  }
  return [...new Set(urls)];
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

function stripTags(html) {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(text) {
  return (text.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) || []).filter((w) => w.length > 2).length;
}

function meta(html, name) {
  return (
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1] ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i'))?.[1] ||
    ''
  );
}

function prop(html, property) {
  return (
    html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1] ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'))?.[1] ||
    ''
  );
}

function canonical(html) {
  return (
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1] ||
    ''
  );
}

function titleOf(html) {
  return html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
}

function h1s(html) {
  const matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  return matches.map((m) => stripTags(m[1]).trim()).filter(Boolean);
}

function appRootInnerLen(html) {
  const m = html.match(/<app-root\b[^>]*>([\s\S]*?)<\/app-root>/i);
  if (!m) return 0;
  return m[1].replace(/<!--[\s\S]*?-->/g, '').trim().length;
}

function hasSchema(html, type) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.some((b) => {
    try {
      const j = JSON.parse(b[1]);
      const types = []
        .concat(j['@type'] || [])
        .concat((j['@graph'] || []).flatMap((x) => x['@type'] || []));
      return types.map(String).some((t) => t.toLowerCase().includes(type.toLowerCase()));
    } catch {
      return b[1].toLowerCase().includes(type.toLowerCase());
    }
  });
}

async function follow(url, max = 10) {
  const chain = [];
  let current = url;
  const t0 = Date.now();
  for (let i = 0; i <= max; i++) {
    const res = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    });
    const loc = res.headers.get('location');
    chain.push({
      url: current,
      status: res.status,
      location: loc,
      contentType: res.headers.get('content-type') || '',
      xRobots: res.headers.get('x-robots-tag') || '',
      xOgcSsr: res.headers.get('x-ogc-ssr') || '',
    });
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).href;
      continue;
    }
    const html = /text\/html/i.test(res.headers.get('content-type') || '') ? await res.text() : '';
    return { chain, finalUrl: current, finalStatus: res.status, html, ms: Date.now() - t0 };
  }
  return { chain, finalUrl: current, finalStatus: 0, html: '', ms: Date.now() - t0, loop: true };
}

async function headStatus(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'manual', headers: { 'User-Agent': UA } });
    if (r.status === 405 || r.status === 501) {
      const g = await fetch(url, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': UA } });
      return g.status;
    }
    return r.status;
  } catch {
    return 0;
  }
}

function classify(row) {
  const robots = (row.robotsMeta || '').toLowerCase();
  const xrobots = (row.xRobotsTag || '').toLowerCase();
  const path = (() => {
    try {
      return new URL(row.finalUrl || row.originalUrl).pathname.toLowerCase();
    } catch {
      return '';
    }
  })();

  if (row.finalStatus === 503 || row.initialStatus === 502 || row.finalStatus === 0) {
    const isBlogHost = /blog\.oilandgasclub\.com/i.test(row.originalUrl || '');
    return {
      classification: isBlogHost ? 'F. DUPLICATE_REDIRECT' : 'K. TEMPORARY_503',
      rootCause: isBlogHost
        ? 'Legacy blog host unreachable/502 — must 301 to apex article'
        : 'Upstream/SSR unavailable (502/503/network)',
      action: isBlogHost
        ? 'Nginx+Express: one-hop 301 https://oilandgasclub.com/{lowercase-path}'
        : 'Fix nginx/SSR host',
      confidence: 95,
      decision: isBlogHost ? 'REDIRECT_TO_REPLACEMENT' : 'KEEP_AND_IMPROVE',
      automatable: true,
    };
  }
  if (row.finalStatus === 410) {
    return {
      classification: 'J. REMOVED_410',
      rootCause: 'Permanently removed',
      action: 'Keep 410; ensure absent from sitemap',
      confidence: 99,
      decision: 'REMOVE_410',
      automatable: false,
    };
  }
  if (row.finalStatus === 404) {
    return {
      classification: 'I. REMOVED_404',
      rootCause: 'Unknown or deleted slug',
      action: 'Remove from sitemap; do not soft-200',
      confidence: 90,
      decision: 'REMOVE_404',
      automatable: true,
    };
  }
  if (
    /\/(login|register|forget-password|forgot-password|checkout|payment|dashboard|app\/|auth\/)/.test(path) ||
    robots.includes('noindex') ||
    xrobots.includes('noindex')
  ) {
    return {
      classification: 'G. PRIVATE_NOINDEX',
      rootCause: 'Private/auth page or explicit noindex',
      action: 'Keep noindex; omit from sitemap',
      confidence: 95,
      decision: 'NOINDEX',
      automatable: false,
    };
  }
  if (row.redirectCount >= 1 && row.finalStatus === 200) {
    return {
      classification: 'F. DUPLICATE_REDIRECT',
      rootCause: 'Alternate host/path that should permanently redirect',
      action: 'One-hop 301 to canonical; remove source from sitemap',
      confidence: 90,
      decision: 'REDIRECT_TO_REPLACEMENT',
      automatable: true,
    };
  }
  if (row.emptyAppRoot || row.soft404 || row.ssrHtmlAvailable === 'no') {
    return {
      classification: 'D. INDEXABLE_TECHNICAL_ISSUE',
      rootCause: 'SSR returns empty <app-root> / meta-only shell (crawled but not indexed)',
      action: 'Fix SSR body render; refuse caching empty shells; inject crawler body fallback',
      confidence: 98,
      decision: 'KEEP_AND_IMPROVE',
      automatable: true,
    };
  }
  if (!row.canonicalConsistent || row.canonicalStatus !== 200) {
    return {
      classification: 'D. INDEXABLE_TECHNICAL_ISSUE',
      rootCause: 'Canonical missing, inconsistent, or non-200',
      action: 'Set self-referencing canonical on SSR HTML',
      confidence: 85,
      decision: 'KEEP_AND_IMPROVE',
      automatable: true,
    };
  }
  if (row.wordCount > 0 && row.wordCount < 250) {
    return {
      classification: 'B. INDEXABLE_NEEDS_CONTENT',
      rootCause: 'Thin main content after technical checks',
      action: 'Human content improvement; do not fabricate engineering claims',
      confidence: 70,
      decision: 'KEEP_AND_IMPROVE',
      automatable: false,
    };
  }
  if (row.internalLinkSources === 0 || row.orphanLikely) {
    return {
      classification: 'C. INDEXABLE_NEEDS_INTERNAL_LINKS',
      rootCause: 'Weak/orphan internal linking signals',
      action: 'Add related-posts + category/hub contextual links',
      confidence: 65,
      decision: 'KEEP_AND_IMPROVE',
      automatable: true,
    };
  }
  return {
    classification: 'A. INDEXABLE_HEALTHY',
    rootCause: 'Technically indexable with SSR body',
    action: 'Keep; request indexing after deploy',
    confidence: 60,
    decision: 'KEEP_AS_IS',
    automatable: false,
  };
}

async function loadSitemap(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) return new Set();
    const xml = await r.text();
    return new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim()));
  } catch {
    return new Set();
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const urls = parseUrlList(URLS_FILE);
  console.log(`Auditing ${urls.length} URLs from ${URLS_FILE}`);
  const sitemap = await loadSitemap(SITEMAP_URL);
  console.log(`Sitemap entries: ${sitemap.size} (${SITEMAP_URL})`);

  const rows = await mapPool(urls, CONCURRENCY, async (originalUrl) => {
    let result;
    try {
      result = await follow(originalUrl);
    } catch (err) {
      const failed = {
        originalUrl,
        initialStatus: 0,
        redirectCount: 0,
        redirectChain: '',
        finalUrl: originalUrl,
        finalStatus: 0,
        responseTimeMs: 0,
        contentType: '',
        ssrHtmlAvailable: 'no',
        emptyAppRoot: true,
        soft404: true,
        robotsMeta: '',
        xRobotsTag: '',
        xOgcSsr: '',
        canonicalUrl: '',
        canonicalStatus: 0,
        canonicalConsistent: false,
        title: '',
        titleLength: 0,
        metaDescription: '',
        descriptionLength: 0,
        h1Count: 0,
        h1Text: '',
        wordCount: 0,
        sitemapPresence: sitemap.has(originalUrl) || sitemap.has(originalUrl.replace(/\/$/, '')),
        breadcrumbSchema: false,
        articleSchema: false,
        faqSchema: false,
        publishedDate: '',
        modifiedDate: '',
        author: '',
        featuredImage: '',
        soft404Indicators: String(err?.message || err),
        thinContent: true,
        orphanLikely: true,
        queryDuplicate: originalUrl.includes('?'),
        wwwDuplicate: /\/\/www\./i.test(originalUrl),
        caseDuplicate: /[A-Z]/.test(new URL(originalUrl).pathname),
        trailingSlashDuplicate: /\/$/.test(new URL(originalUrl).pathname) && new URL(originalUrl).pathname !== '/',
        internalLinkSources: 0,
        outgoingInternalLinks: 0,
        error: String(err?.message || err),
      };
      const c = classify(failed);
      return { ...failed, ...c };
    }

    const first = result.chain[0] || {};
    const html = result.html || '';
    const text = stripTags(html);
    const h1List = h1s(html);
    const canon = canonical(html);
    const title = titleOf(html);
    const desc = meta(html, 'description') || prop(html, 'og:description');
    const emptyRoot = appRootInnerLen(html) < 80;
    const softMarkers = SOFT_404_MARKERS.filter((m) => text.toLowerCase().includes(m));
    const soft404 = emptyRoot || softMarkers.length > 0 || (result.finalStatus === 200 && wordCount(text) < 40);
    const robotsMeta = meta(html, 'robots');
    const pathOnly = (() => {
      try {
        return new URL(result.finalUrl).pathname;
      } catch {
        return '';
      }
    })();
    const outgoing = [...html.matchAll(/href=["'](https?:\/\/oilandgasclub\.com[^"']+|\/[^"']+)["']/gi)].length;
    let canonicalStatus = 0;
    if (canon) {
      canonicalStatus = await headStatus(canon);
    }
    const selfCanon =
      !!canon &&
      canon.replace(/\/+$/, '').toLowerCase() ===
        (result.finalUrl || '').split('#')[0].split('?')[0].replace(/\/+$/, '').toLowerCase();

    const row = {
      originalUrl,
      initialStatus: first.status || 0,
      redirectCount: Math.max(0, result.chain.length - 1),
      redirectChain: result.chain.map((c) => `${c.status}${c.location ? '→' + c.location : ''}`).join(' | '),
      finalUrl: result.finalUrl,
      finalStatus: result.finalStatus,
      responseTimeMs: result.ms,
      contentType: first.contentType || '',
      ssrHtmlAvailable: emptyRoot ? 'no' : 'yes',
      emptyAppRoot: emptyRoot,
      soft404,
      robotsMeta,
      xRobotsTag: first.xRobots || result.chain[result.chain.length - 1]?.xRobots || '',
      xOgcSsr: first.xOgcSsr || result.chain[result.chain.length - 1]?.xOgcSsr || '',
      canonicalUrl: canon,
      canonicalStatus,
      canonicalConsistent: selfCanon,
      title,
      titleLength: title.length,
      metaDescription: desc,
      descriptionLength: desc.length,
      h1Count: h1List.length,
      h1Text: h1List.join(' | '),
      wordCount: wordCount(text),
      sitemapPresence:
        sitemap.has(originalUrl) ||
        sitemap.has(result.finalUrl) ||
        sitemap.has(`${CANONICAL_ORIGIN}${pathOnly}`),
      breadcrumbSchema: hasSchema(html, 'BreadcrumbList'),
      articleSchema: hasSchema(html, 'BlogPosting') || hasSchema(html, 'Article'),
      faqSchema: hasSchema(html, 'FAQPage'),
      publishedDate: prop(html, 'article:published_time'),
      modifiedDate: prop(html, 'article:modified_time'),
      author: meta(html, 'author') || prop(html, 'article:author'),
      featuredImage: prop(html, 'og:image'),
      soft404Indicators: softMarkers.join('; ') || (emptyRoot ? 'empty-app-root' : ''),
      thinContent: wordCount(text) < 250,
      orphanLikely: true, // refined after duplicate pass if needed
      queryDuplicate: originalUrl.includes('?'),
      wwwDuplicate: /\/\/www\./i.test(originalUrl),
      caseDuplicate: /[A-Z]/.test(new URL(originalUrl).pathname),
      trailingSlashDuplicate: /\/$/.test(new URL(originalUrl).pathname) && new URL(originalUrl).pathname !== '/',
      internalLinkSources: 0,
      outgoingInternalLinks: outgoing,
      error: '',
    };

    const c = classify(row);
    return { ...row, ...c };
  });

  // Duplicate groups by title / description / h1
  const byTitle = new Map();
  const byDesc = new Map();
  const byH1 = new Map();
  for (const r of rows) {
    if (r.title) byTitle.set(r.title, (byTitle.get(r.title) || 0) + 1);
    if (r.metaDescription) byDesc.set(r.metaDescription, (byDesc.get(r.metaDescription) || 0) + 1);
    if (r.h1Text) byH1.set(r.h1Text, (byH1.get(r.h1Text) || 0) + 1);
  }
  for (const r of rows) {
    r.duplicateTitleGroup = r.title && byTitle.get(r.title) > 1 ? r.title : '';
    r.duplicateDescriptionGroup = r.metaDescription && byDesc.get(r.metaDescription) > 1 ? r.metaDescription : '';
    r.duplicateH1Group = r.h1Text && byH1.get(r.h1Text) > 1 ? r.h1Text : '';
  }

  const auditCols = [
    'originalUrl', 'initialStatus', 'redirectCount', 'redirectChain', 'finalUrl', 'finalStatus',
    'responseTimeMs', 'contentType', 'ssrHtmlAvailable', 'emptyAppRoot', 'soft404',
    'robotsMeta', 'xRobotsTag', 'xOgcSsr', 'canonicalUrl', 'canonicalStatus', 'canonicalConsistent',
    'title', 'titleLength', 'metaDescription', 'descriptionLength', 'h1Count', 'h1Text', 'wordCount',
    'duplicateTitleGroup', 'duplicateDescriptionGroup', 'duplicateH1Group',
    'sitemapPresence', 'breadcrumbSchema', 'articleSchema', 'faqSchema',
    'publishedDate', 'modifiedDate', 'author', 'featuredImage',
    'soft404Indicators', 'thinContent', 'orphanLikely',
    'queryDuplicate', 'wwwDuplicate', 'caseDuplicate', 'trailingSlashDuplicate',
    'internalLinkSources', 'outgoingInternalLinks',
    'classification', 'rootCause', 'action', 'confidence', 'decision', 'automatable', 'error',
  ];
  writeFileSync(join(OUT_DIR, 'seo-indexing-audit.csv'), toCsv(rows, auditCols));

  const redirectRows = rows
    .filter((r) => r.redirectCount > 0 || r.classification?.includes('DUPLICATE_REDIRECT') || /blog\.oilandgasclub/i.test(r.originalUrl))
    .map((r) => ({
      sourceUrl: r.originalUrl,
      initialStatus: r.initialStatus,
      hops: r.redirectCount,
      recommendedTarget: r.finalStatus === 200 ? r.finalUrl : `${CANONICAL_ORIGIN}${new URL(r.originalUrl).pathname.toLowerCase()}`,
      action: r.action,
      classification: r.classification,
    }));
  writeFileSync(
    join(OUT_DIR, 'seo-redirect-map.csv'),
    toCsv(redirectRows, ['sourceUrl', 'initialStatus', 'hops', 'recommendedTarget', 'action', 'classification'])
  );

  const dupRows = rows
    .filter((r) => r.duplicateTitleGroup || r.duplicateDescriptionGroup || r.duplicateH1Group)
    .map((r) => ({
      url: r.originalUrl,
      titleGroup: r.duplicateTitleGroup,
      descriptionGroup: r.duplicateDescriptionGroup,
      h1Group: r.duplicateH1Group,
      wordCount: r.wordCount,
      decision: r.decision,
    }));
  writeFileSync(
    join(OUT_DIR, 'seo-duplicate-groups.csv'),
    toCsv(dupRows, ['url', 'titleGroup', 'descriptionGroup', 'h1Group', 'wordCount', 'decision'])
  );

  const contentPlan = rows
    .filter((r) => r.classification?.startsWith('B.') || r.thinContent)
    .map((r) => ({
      url: r.originalUrl,
      wordCount: r.wordCount,
      title: r.title,
      issue: r.rootCause,
      recommendedSections: 'Intro; definition; applications; examples; FAQs (only if genuine Q&A); conclusion — human review required for engineering accuracy',
      humanReviewRequired: true,
    }));
  writeFileSync(
    join(OUT_DIR, 'seo-content-improvement-plan.csv'),
    toCsv(contentPlan, ['url', 'wordCount', 'title', 'issue', 'recommendedSections', 'humanReviewRequired'])
  );

  const linkPlan = rows
    .filter((r) => r.classification?.startsWith('C.') || r.classification?.startsWith('D.') || r.orphanLikely)
    .map((r) => ({
      url: r.originalUrl,
      suggestedSources: '/blog hub; same-category related posts; matching /category/* hub; breadcrumbs',
      suggestedOutgoing: '2–5 related articles + relevant course if exists',
      priority: r.classification?.startsWith('D.') ? 'P1-technical-first' : 'P3-links',
    }));
  writeFileSync(
    join(OUT_DIR, 'seo-internal-link-plan.csv'),
    toCsv(linkPlan, ['url', 'suggestedSources', 'suggestedOutgoing', 'priority'])
  );

  const sitemapVal = rows.map((r) => ({
    url: r.originalUrl,
    inSitemap: r.sitemapPresence,
    finalStatus: r.finalStatus,
    shouldBeInSitemap:
      r.finalStatus === 200 &&
      !r.soft404 &&
      !String(r.robotsMeta).toLowerCase().includes('noindex') &&
      r.redirectCount === 0 &&
      !/blog\.oilandgasclub|\/\/www\./i.test(r.originalUrl),
    note: r.emptyAppRoot ? 'empty-app-root — do not treat as healthy sitemap target until SSR body fixed' : '',
  }));
  writeFileSync(
    join(OUT_DIR, 'seo-sitemap-validation.csv'),
    toCsv(sitemapVal, ['url', 'inSitemap', 'finalStatus', 'shouldBeInSitemap', 'note'])
  );

  const testRows = rows.map((r) => ({
    url: r.originalUrl,
    initialStatus: r.initialStatus,
    redirectCount: r.redirectCount,
    finalUrl: r.finalUrl,
    finalStatus: r.finalStatus,
    canonical: r.canonicalUrl,
    canonicalStatus: r.canonicalStatus,
    robotsMeta: r.robotsMeta,
    xRobotsTag: r.xRobotsTag,
    h1: r.h1Text,
    wordCount: r.wordCount,
    sitemapPresence: r.sitemapPresence,
    articleSchema: r.articleSchema,
    emptyAppRoot: r.emptyAppRoot,
    pass:
      r.classification?.startsWith('A.') ||
      (r.classification?.startsWith('F.') && r.redirectCount === 1 && r.finalStatus === 200) ||
      (r.classification?.startsWith('G.') && String(r.robotsMeta).toLowerCase().includes('noindex')),
    classification: r.classification,
  }));
  writeFileSync(
    join(OUT_DIR, 'seo-production-test-results.csv'),
    toCsv(testRows, [
      'url', 'initialStatus', 'redirectCount', 'finalUrl', 'finalStatus', 'canonical', 'canonicalStatus',
      'robotsMeta', 'xRobotsTag', 'h1', 'wordCount', 'sitemapPresence', 'articleSchema', 'emptyAppRoot',
      'pass', 'classification',
    ])
  );

  const counts = {};
  for (const r of rows) {
    counts[r.classification] = (counts[r.classification] || 0) + 1;
  }
  const summary = `# SEO indexing audit summary

Generated: ${new Date().toISOString()}
Source: \`${URLS_FILE}\`
Sitemap: \`${SITEMAP_URL}\` (${sitemap.size} locs)
URLs audited: **${rows.length}**

## Classification counts

${Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join('\n')}

## Critical finding

${rows.filter((r) => r.emptyAppRoot).length} / ${rows.length} URLs returned an **empty \`<app-root>\`** in the raw HTML (meta/canonical present, no H1/body). This is the dominant "Crawled – currently not indexed" technical cause.

## Sample decisions

${rows
  .slice(0, 20)
  .map(
    (r) =>
      `- \`${r.originalUrl}\` → **${r.classification}** / ${r.decision} — ${r.rootCause}`
  )
  .join('\n')}

## Output files

- \`seo-indexing-audit.csv\`
- \`seo-redirect-map.csv\`
- \`seo-duplicate-groups.csv\`
- \`seo-content-improvement-plan.csv\`
- \`seo-internal-link-plan.csv\`
- \`seo-sitemap-validation.csv\`
- \`seo-production-test-results.csv\`
`;
  writeFileSync(join(OUT_DIR, 'seo-indexing-audit-summary.md'), summary);

  console.log(`\nWrote reports to ${OUT_DIR}`);
  console.log(summary);
  const failures = rows.filter((r) => r.classification?.startsWith('D.') || r.classification?.startsWith('K.'));
  process.exit(failures.length ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
