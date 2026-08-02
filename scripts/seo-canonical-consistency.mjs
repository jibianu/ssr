#!/usr/bin/env node
/**
 * Compare SSR canonical vs sitemap vs final redirect URL for hub/course pages.
 * Hydrated browser DOM must be checked manually or via Playwright after deploy.
 *
 * Usage: node scripts/seo-canonical-consistency.mjs
 */
const ORIGIN = 'https://oilandgasclub.com';
const PATHS = ['/events', '/blog', '/instrumentation-design-course'];

async function get(url) {
  const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'seo-canonical-consistency/1.0' } });
  const loc = res.headers.get('location');
  const html = res.status === 200 ? await res.text() : '';
  return { status: res.status, loc, html };
}

function canonicalFromHtml(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return m ? m[1].trim() : '';
}

async function main() {
  const smRes = await fetch(`${ORIGIN}/sitemap.xml`);
  const smXml = smRes.ok ? await smRes.text() : '';
  const sm = new Set([...smXml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((m) => m[1].trim()));

  let failed = 0;
  for (const path of PATHS) {
    const apex = `${ORIGIN}${path}`;
    const www = `https://www.oilandgasclub.com${path}`;
    const slash = `${ORIGIN}${path}/`;

    const [a, w, s] = await Promise.all([get(apex), get(www), get(slash)]);
    const canon = canonicalFromHtml(a.html);
    const inSm = sm.has(apex);
    const wwwOk = w.status >= 300 && w.status < 400 && new URL(w.loc || '', www).href.replace(/\/+$/, '') === apex;
    const slashOk = s.status >= 300 && s.status < 400 && new URL(s.loc || '', slash).href.replace(/\/+$/, '') === apex;
    const self = canon === apex;
    const bodyOk = /<app-root\b[^>]*>([\s\S]{200,})<\/app-root>/i.test(a.html);
    const pass = a.status === 200 && self && inSm && wwwOk && slashOk && bodyOk;
    if (!pass) failed++;
    console.log(JSON.stringify({
      path,
      pass,
      apexStatus: a.status,
      ssrCanonical: canon,
      sitemap: inSm,
      wwwStatus: w.status,
      wwwLocation: w.loc,
      slashStatus: s.status,
      slashLocation: s.loc,
      appRootHasBody: bodyOk,
      note: 'Compare hydrated DOM canonical in browser DevTools after deploy — must equal ssrCanonical',
    }, null, 2));
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
