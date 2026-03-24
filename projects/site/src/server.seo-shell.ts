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
    'worlds-largest-refineries',
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
    'performance-metrics'
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

function absoluteImage(origin: string, raw: string): string {
  const s = (raw ?? '').toString().trim();
  if (!s) return `${origin}/assets/images/og-image.jpg`;
  if (/^https?:\/\//i.test(s)) return s;
  return `${origin}/${s.replace(/^\//, '')}`;
}

function buildMetaSnippet(title: string, description: string, image: string, canonical: string): string {
  const esc = escapeHtmlAttr;
  const desc = description.slice(0, 500);
  return `
  <link rel="canonical" href="${esc(canonical)}" />
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="article" />
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

  const metaBlock = buildMetaSnippet(title, description, image, canonical);
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)} | Oilandgasclub</title>`);
  const headClose = /<\/head>/i;
  if (headClose.test(out)) {
    out = out.replace(headClose, `${metaBlock}\n</head>`);
  }
  return { html: out, injected: true };
}
