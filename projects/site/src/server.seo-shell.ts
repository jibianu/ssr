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
  const fwd = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const proto = fwd || (req as { protocol?: string }).protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim() || req.headers.host || 'www.oilandgasclub.com';
  const origin = `${proto}://${host}`;
  const pathOnly = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
  const canonical = `${origin}${pathOnly}`;
  return { origin, canonical };
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

/**
 * When Angular SSR returns 200 with the CSR shell (empty app-root), `og:title` is usually missing.
 * Enrich only if absent to avoid duplicating tags when real SSR populated the head.
 */
export async function enrichPublicCoursePageIfMissingOg(
  html: string,
  requestPath: string,
  req: Request
): Promise<{ html: string; injected: boolean }> {
  // Static listing pages (inject only if missing OG).
  const pathOnly = (requestPath || '').split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  if ((pathOnly === '/blog' || pathOnly === '/events' || pathOnly === '/courses') && !/property\s*=\s*["']og:title["']/i.test(html)) {
    const { origin, canonical } = pageOriginAndUrl(req, pathOnly);
    const title =
      pathOnly === '/blog'
        ? 'Blog | Oilandgasclub'
        : pathOnly === '/events'
          ? 'Events | Oilandgasclub'
          : 'Courses | Oilandgasclub';
    const description =
      pathOnly === '/blog'
        ? 'Read the latest oil and gas industry blogs, insights, and learning resources on Oilandgasclub.'
        : pathOnly === '/events'
          ? 'Explore upcoming oil and gas events, training sessions, and professional workshops on Oilandgasclub.'
          : 'Browse oil and gas courses and certification prep programs on Oilandgasclub.';
    const image = `${origin}/assets/images/og-image.jpg`;
    const metaBlock = buildMetaSnippet(title, description, image, canonical, 'website');
    let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)}</title>`);
    const headClose = /<\/head>/i;
    if (headClose.test(out)) {
      out = out.replace(headClose, `${metaBlock}\n</head>`);
      return { html: out, injected: true };
    }
    return { html, injected: false };
  }

  const slug = extractSingleSegmentSlug(requestPath);
  if (!slug) {
    return { html, injected: false };
  }
  if (/property\s*=\s*["']og:title["']/i.test(html)) {
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
    const metaBlock = buildMetaSnippet(title, description, image, canonical, 'article');
    let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)} | Oilandgasclub</title>`);
    const headClose = /<\/head>/i;
    if (headClose.test(out)) {
      out = out.replace(headClose, `${metaBlock}\n</head>`);
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
    const metaBlock = buildMetaSnippet(title, description, image, canonical, 'article');
    let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)} | Oilandgasclub</title>`);
    const headClose = /<\/head>/i;
    if (headClose.test(out)) {
      out = out.replace(headClose, `${metaBlock}\n</head>`);
    }
    return { html: out, injected: true };
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
  if (headClose.test(out)) {
    out = out.replace(headClose, `${metaBlock}\n</head>`);
  }
  return { html: out, injected: true };
}
