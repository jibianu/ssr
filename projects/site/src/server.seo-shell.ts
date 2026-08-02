/**
 * When Angular SSR returns the CSR shell (empty <app-root>), inject course SEO tags by calling
 * the public API. Helps crawlers and "View Source" until SSR/nginx is fixed.
 */
import type { Request } from 'express';

const RESERVED_SINGLE_SEGMENT = new Set(
  [
    'courses',
    'list',
    'events',
    'contact-us',
    'about-us',
    'partner-us',
    'career',
    'membership',
    'become-our-trainer',
    'guest-blogging',
    'corporate-training',
    'courses-offered',
    'why-oilandgasclub',
    'build-your-portfolio',
    'in-house-solutions',
    'policies',
    'mission-and-vision',
    'affiliate-program',
    'terms-and-conditions',
    'privacy-policy',
    'refund-cancellation-policy',
    'page-not-found',
    'search',
    'checkout',
    'payment-success',
    'category',
    'blog',
    'app',
    'auth',
    'login',
    'register',
    'callback',
    'google-callback',
    'forget-password',
    'verification',
    'fg-code',
    'change-password',
    'user-unavailable',
    'register-company',
    'register-trainer',
    'register-affiliate',
    'register-management',
    'cache-stats',
    'performance-stats',
    'performance-metrics',
    'dashboard',
    'company',
    'admin',
    'trainer',
    'student',
    'management',
    'affiliate'
  ].map((s) => s.toLowerCase())
);

type CacheEntry = { course: Record<string, unknown> | null; exp: number };

const courseFetchCache = new Map<string, CacheEntry>();
const CACHE_OK_MS = 5 * 60 * 1000;
const CACHE_MISS_MS = 60 * 1000;

function getPublicApiBase(): string {
  const u = (process.env['PUBLIC_API_URL'] || process.env['SSR_API_URL'] || 'https://coursebackend.oilandgasclub.com/')
    .trim();
  return u.endsWith('/') ? u : `${u}/`;
}

type SlugType = 'course' | 'blog' | 'event';
type SlugResolveEntry = { resolved: { type: SlugType; slug: string } | null; exp: number };
const slugResolveCache = new Map<string, SlugResolveEntry>();

function extractSingleSegmentSlug(path: string): string | null {
  const clean = path.split('?')[0].split('#')[0].replace(/\/$/, '') || '';
  if (!clean || clean === '/') return null;
  const segments = clean.split('/').filter(Boolean);
  if (segments.length !== 1) return null;
  const seg = segments[0]!;
  if (seg.includes('.')) return null;
  if (RESERVED_SINGLE_SEGMENT.has(seg.toLowerCase())) return null;
  return seg;
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/\r?\n/g, ' ');
}

function escapeHtmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function pageOriginAndUrl(req: Request, requestPath: string): { origin: string; canonical: string } {
  // Always emit the marketing canonical host — never www / http from the request Host.
  // (If www somehow reaches SSR before redirect, meta must still self-reference apex.)
  void req;
  const origin = 'https://oilandgasclub.com';
  const pathOnly = (requestPath.startsWith('/') ? requestPath : `/${requestPath}`).replace(/\/+$/, '') || '/';
  const canonical = `${origin}${pathOnly === '/' ? '' : pathOnly}`;
  return { origin, canonical: pathOnly === '/' ? `${origin}/` : canonical };
}

async function fetchPublicCourseBySlug(slug: string): Promise<Record<string, unknown> | null> {
  const now = Date.now();
  const cached = courseFetchCache.get(slug);
  if (cached && cached.exp > now) {
    return cached.course;
  }

  const base = getPublicApiBase();
  const url = `${base}api/public/courses/${encodeURIComponent(slug)}`;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(t);
    if (!res.ok) {
      courseFetchCache.set(slug, { course: null, exp: now + CACHE_MISS_MS });
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    courseFetchCache.set(slug, { course: data, exp: now + CACHE_OK_MS });
    return data;
  } catch {
    courseFetchCache.set(slug, { course: null, exp: now + CACHE_MISS_MS });
    return null;
  }
}

async function resolveSlugType(slug: string): Promise<{ type: SlugType; slug: string } | null> {
  const key = (slug || '').trim().toLowerCase();
  if (!key) return null;

  const now = Date.now();
  const cached = slugResolveCache.get(key);
  if (cached && cached.exp > now) {
    return cached.resolved;
  }

  const base = getPublicApiBase();
  const url = `${base}api/slug-resolver/${encodeURIComponent(slug.trim())}`;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 5000);
    const res = await fetch(url, { signal: ac.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t);
    if (!res.ok) {
      slugResolveCache.set(key, { resolved: null, exp: now + CACHE_MISS_MS });
      return null;
    }
    const data = (await res.json()) as { type?: unknown; Type?: unknown; slug?: unknown; Slug?: unknown };
    const typeRaw = (data?.type ?? data?.Type ?? '').toString().trim().toLowerCase();
    if (typeRaw !== 'course' && typeRaw !== 'blog' && typeRaw !== 'event') {
      slugResolveCache.set(key, { resolved: null, exp: now + CACHE_MISS_MS });
      return null;
    }
    const slugRaw = (data?.slug ?? data?.Slug ?? slug).toString().trim() || slug.trim();
    const normalizedSlug = slugRaw
      .replace(/[?#].*$/, '')
      .replace(/^\/+/, '')
      .replace(/&/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    const resolved = { type: typeRaw as SlugType, slug: normalizedSlug };
    slugResolveCache.set(key, { resolved, exp: now + CACHE_OK_MS });
    return resolved;
  } catch {
    slugResolveCache.set(key, { resolved: null, exp: now + CACHE_MISS_MS });
    return null;
  }
}

async function fetchPublicBlogBySlug(slug: string): Promise<Record<string, unknown> | null> {
  const now = Date.now();
  const key = `blog:${slug.toLowerCase()}`;
  const cached = courseFetchCache.get(key);
  if (cached && cached.exp > now) {
    return cached.course;
  }

  const base = getPublicApiBase();
  const url = `${base}api/blog/${encodeURIComponent(slug)}`;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    const res = await fetch(url, { signal: ac.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t);
    if (!res.ok) {
      courseFetchCache.set(key, { course: null, exp: now + CACHE_MISS_MS });
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    courseFetchCache.set(key, { course: data, exp: now + CACHE_OK_MS });
    return data;
  } catch {
    courseFetchCache.set(key, { course: null, exp: now + CACHE_MISS_MS });
    return null;
  }
}

async function fetchPublicEventBySlug(slug: string): Promise<Record<string, unknown> | null> {
  const now = Date.now();
  const key = `event:${slug.toLowerCase()}`;
  const cached = courseFetchCache.get(key);
  if (cached && cached.exp > now) {
    return cached.course;
  }

  const base = getPublicApiBase();
  // Public canonical event detail.
  const url = `${base}api/events/event/${encodeURIComponent(slug)}`;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    const res = await fetch(url, { signal: ac.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t);
    if (!res.ok) {
      courseFetchCache.set(key, { course: null, exp: now + CACHE_MISS_MS });
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    courseFetchCache.set(key, { course: data, exp: now + CACHE_OK_MS });
    return data;
  } catch {
    courseFetchCache.set(key, { course: null, exp: now + CACHE_MISS_MS });
    return null;
  }
}

function absoluteImage(origin: string, raw: string): string {
  const s = (raw ?? '').toString().trim();
  if (!s) return `${origin}/assets/images/og-image.jpg`;
  if (/^https?:\/\//i.test(s)) return s;
  return `${origin}/${s.replace(/^\//, '')}`;
}

function buildMetaSnippet(title: string, description: string, image: string, canonical: string, ogType: string): string {
  const esc = escapeHtmlAttr;
  const desc = description.slice(0, 500);
  return `
  <link rel="canonical" href="${esc(canonical)}" />
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="${esc(ogType)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(image)}" />
  <meta property="og:site_name" content="oilandgasclub" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${esc(image)}" />
`;
}

/** True when Angular SSR left an empty shell (GSC "crawled – not indexed" driver). */
export function isEmptyAppRootHtml(html: string): boolean {
  const m = html.match(/<app-root\b[^>]*>([\s\S]*?)<\/app-root>/i);
  if (!m) {
    return true;
  }
  const inner = m[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+/g, '')
    .trim();
  // Real SSR pages contain substantial markup; meta-only shells are ~0–40 chars.
  return inner.length < 80;
}

/** Strip executable tags from CMS HTML before injecting into the crawler body. */
function sanitizeCmsHtml(raw: string): string {
  return (raw || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

function buildBlogPostingJsonLd(opts: {
  title: string;
  description: string;
  canonical: string;
  image: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: opts.title,
    description: opts.description,
    url: opts.canonical,
    mainEntityOfPage: opts.canonical,
    image: opts.image,
    datePublished: opts.datePublished || undefined,
    dateModified: opts.dateModified || opts.datePublished || undefined,
    author: {
      '@type': 'Person',
      name: opts.authorName || 'Oilandgasclub',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Oilandgasclub',
      url: 'https://oilandgasclub.com',
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

/**
 * Inject crawler-visible H1 + article body into an empty &lt;app-root&gt;.
 * Angular client bootstrap replaces this on hydration; crawlers that do not
 * execute JS finally see real content (fixes meta-only soft-200 shells).
 */
function injectCrawlerBody(
  html: string,
  opts: { title: string; bodyHtml: string; jsonLd?: string }
): string {
  if (!isEmptyAppRootHtml(html)) {
    return html;
  }
  const title = escapeHtmlText(opts.title || 'Article');
  const body = sanitizeCmsHtml(opts.bodyHtml || '');
  if (!body.trim()) {
    return html;
  }
  const article = `<article class="ogc-ssr-crawler-content" data-ogc-ssr-body="1"><h1>${title}</h1>${body}</article>`;
  const withRoot = html.replace(
    /<app-root(\b[^>]*)>[\s\S]*?<\/app-root>/i,
    `<app-root$1>${article}</app-root>`
  );
  if (opts.jsonLd && /<\/head>/i.test(withRoot) && !/application\/ld\+json/i.test(withRoot)) {
    return withRoot.replace(/<\/head>/i, `${opts.jsonLd}\n</head>`);
  }
  return withRoot;
}

/**
 * When Angular SSR returns 200 with the CSR shell (empty app-root), `og:title` is usually missing.
 * Enrich meta AND inject crawler-visible body HTML when &lt;app-root&gt; is empty so Google
 * does not classify the URL as "Crawled – currently not indexed".
 */
export async function enrichPublicCoursePageIfMissingOg(
  html: string,
  requestPath: string,
  req: Request
): Promise<{ html: string; injected: boolean }> {
  const needsMeta = !/property\s*=\s*["']og:title["']/i.test(html);
  const needsBody = isEmptyAppRootHtml(html);
  if (!needsMeta && !needsBody) {
    return { html, injected: false };
  }

  // Static listing hubs — unique title/desc + crawler body when app-root is empty.
  const pathOnly = (requestPath || '').split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  if (pathOnly === '/blog' || pathOnly === '/events' || pathOnly === '/courses') {
    if (!needsMeta && !needsBody) {
      return { html, injected: false };
    }
    const { origin, canonical } = pageOriginAndUrl(req, pathOnly);
    const title =
      pathOnly === '/blog'
        ? 'Oil and Gas Engineering Articles | Oilandgasclub'
        : pathOnly === '/events'
          ? 'Oil and Gas Engineering Workshops and Events | Oilandgasclub'
          : 'Oil and Gas Courses | Oilandgasclub';
    const h1 =
      pathOnly === '/blog'
        ? 'Oil and Gas Engineering Articles'
        : pathOnly === '/events'
          ? 'Oil and Gas Engineering Workshops and Events'
          : 'Oil and Gas Courses';
    const description =
      pathOnly === '/blog'
        ? 'Browse oil and gas engineering articles, industry insights, and practical learning resources from Oilandgasclub instructors and practitioners.'
        : pathOnly === '/events'
          ? 'Find upcoming oil and gas engineering workshops, expert sessions, and recorded events hosted by Oilandgasclub.'
          : 'Browse oil and gas courses and certification prep programs on Oilandgasclub.';
    const intro =
      pathOnly === '/blog'
        ? 'This hub lists Oilandgasclub engineering articles by category. Use category filters and pagination to find instrumentation, piping, process, NDT, and API topics.'
        : pathOnly === '/events'
          ? 'This page lists upcoming Oilandgasclub workshops and expert sessions, plus completed events when recordings or recaps are available. Each event card links to a dedicated event page.'
          : 'Browse public oil and gas training courses and certification preparation programs.';
    const image = `${origin}/assets/images/og-image.jpg`;
    let out = html;
    if (needsMeta) {
      const metaBlock = buildMetaSnippet(title, description, image, canonical, 'website');
      out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)}</title>`);
      if (/<\/head>/i.test(out)) {
        out = out.replace(/<\/head>/i, `${metaBlock}\n</head>`);
      }
    }
    if (needsBody) {
      const collectionLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': pathOnly === '/blog' ? 'Blog' : 'CollectionPage',
        name: h1,
        description,
        url: canonical,
        mainEntityOfPage: canonical,
        isPartOf: { '@type': 'WebSite', name: 'Oilandgasclub', url: origin },
      });
      out = injectCrawlerBody(out, {
        title: h1,
        bodyHtml: `<p>${escapeHtmlText(intro)}</p><p><a href="${canonical}">${escapeHtmlText(h1)}</a></p>`,
        jsonLd: `<script type="application/ld+json">${collectionLd}</script>`,
      });
    }
    return { html: out, injected: out !== html };
  }

  const slug = extractSingleSegmentSlug(requestPath);
  if (!slug) {
    return { html, injected: false };
  }

  // Universal slug: resolve type first so we can enrich blog/event too.
  const resolved = await resolveSlugType(slug);
  if (!resolved) {
    return { html, injected: false };
  }

  if (resolved.type === 'course') {
    return enrichCsrShellHtml(html, `/${resolved.slug}`, req);
  }

  if (resolved.type === 'blog') {
    const blog = await fetchPublicBlogBySlug(resolved.slug);
    if (!blog) return { html, injected: false };
    const title = (blog['title'] ?? blog['Title'] ?? 'Blog').toString().trim() || 'Blog';
    const rawDesc = (blog['metaDescription'] ?? blog['MetaDescription'] ?? blog['description'] ?? blog['Description'] ?? '').toString().trim();
    const description = rawDesc || `${title} — Oilandgasclub blog.`;
    const { origin, canonical } = pageOriginAndUrl(req, `/${resolved.slug}`);
    const rawImg = (blog['titleImgUrl'] ?? blog['TitleImgUrl'] ?? blog['titleImageUrl'] ?? blog['TitleImageUrl'] ?? '').toString().trim();
    const image = absoluteImage(origin, rawImg);
    let out = html;
    if (needsMeta) {
      const metaBlock = buildMetaSnippet(title, description, image, canonical, 'article');
      out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)} | Oilandgasclub</title>`);
      if (/<\/head>/i.test(out)) {
        out = out.replace(/<\/head>/i, `${metaBlock}\n</head>`);
      }
    }
    if (needsBody) {
      const content = (blog['content'] ?? blog['Content'] ?? '').toString();
      const sections = Array.isArray(blog['blogSections'] ?? blog['BlogSections'])
        ? ((blog['blogSections'] ?? blog['BlogSections']) as Array<Record<string, unknown>>)
        : [];
      const sectionHtml = sections
        .map((s) => {
          const st = (s['title'] ?? s['Title'] ?? '').toString();
          const sc = (s['content'] ?? s['Content'] ?? '').toString();
          return st || sc ? `<section><h2>${escapeHtmlText(st)}</h2>${sc}</section>` : '';
        })
        .join('');
      const authorName = (blog['authorName'] ?? blog['AuthorName'] ?? '').toString();
      const datePublished = (blog['createdOn'] ?? blog['CreatedOn'] ?? '').toString();
      const dateModified = (blog['updatedOn'] ?? blog['UpdatedOn'] ?? datePublished).toString();
      out = injectCrawlerBody(out, {
        title,
        bodyHtml: `${content}${sectionHtml}`,
        jsonLd: buildBlogPostingJsonLd({
          title,
          description,
          canonical,
          image,
          datePublished,
          dateModified,
          authorName,
        }),
      });
    }
    return { html: out, injected: true };
  }

  if (resolved.type === 'event') {
    const ev = await fetchPublicEventBySlug(resolved.slug);
    if (!ev) return { html, injected: false };
    const title = (ev['title'] ?? ev['Title'] ?? 'Event').toString().trim() || 'Event';
    const rawDesc = (ev['metaDescription'] ?? ev['MetaDescription'] ?? ev['description'] ?? ev['Description'] ?? '').toString().trim();
    const description = rawDesc || `${title} — Oilandgasclub event.`;
    const { origin, canonical } = pageOriginAndUrl(req, `/${resolved.slug}`);
    const rawImg = (ev['titleImgUrl'] ?? ev['TitleImgUrl'] ?? ev['titleImageUrl'] ?? ev['TitleImageUrl'] ?? ev['bannerImage'] ?? ev['BannerImage'] ?? '').toString().trim();
    const image = absoluteImage(origin, rawImg);
    let out = html;
    if (needsMeta) {
      const metaBlock = buildMetaSnippet(title, description, image, canonical, 'article');
      out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)} | Oilandgasclub</title>`);
      if (/<\/head>/i.test(out)) {
        out = out.replace(/<\/head>/i, `${metaBlock}\n</head>`);
      }
    }
    if (needsBody) {
      out = injectCrawlerBody(out, {
        title,
        bodyHtml: `<p>${escapeHtmlText(description)}</p>`,
      });
    }
    return { html: out, injected: out !== html };
  }

  return { html, injected: false };
}

/**
 * If `path` looks like a top-level course slug, fetch public course JSON and inject meta + title into the CSR shell.
 * @returns { html, injected } so the caller can set a diagnostic header
 */
export async function enrichCsrShellHtml(
  html: string,
  requestPath: string,
  req: Request
): Promise<{ html: string; injected: boolean }> {
  const slug = extractSingleSegmentSlug(requestPath);
  if (!slug) {
    return { html, injected: false };
  }

  const course = await fetchPublicCourseBySlug(slug);
  if (!course) {
    return { html, injected: false };
  }

  const title =
    (course['title'] ?? course['Title'] ?? course['courseTitle'] ?? course['CourseTitle'] ?? 'Course').toString().trim() ||
    'Course';
  const rawDesc = (
    course['metaDescription'] ??
    course['MetaDescription'] ??
    course['description'] ??
    course['Description'] ??
    ''
  )
    .toString()
    .trim();
  const description = rawDesc || `${title} — Oilandgasclub self-learning course.`;

  const { origin, canonical } = pageOriginAndUrl(req, `/${slug}`);
  const rawImg = (course['titleImageUrl'] ?? course['TitleImageUrl'] ?? course['bannerImage'] ?? course['BannerImage'] ?? '')
    .toString()
    .trim();
  const image = absoluteImage(origin, rawImg);

  const metaBlock = buildMetaSnippet(title, description, image, canonical, 'article');
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)} | Oilandgasclub</title>`);
  const headClose = /<\/head>/i;
  if (headClose.test(out) && !/property\s*=\s*["']og:title["']/i.test(out)) {
    out = out.replace(headClose, `${metaBlock}\n</head>`);
  }
  if (isEmptyAppRootHtml(out)) {
    const longDesc = (
      course['longDescription'] ??
      course['LongDescription'] ??
      course['fullDescription'] ??
      course['FullDescription'] ??
      description
    )
      .toString()
      .trim();
    out = injectCrawlerBody(out, {
      title,
      bodyHtml: `<p>${escapeHtmlText(longDesc)}</p>`,
    });
  }
  return { html: out, injected: true };
}
