import { environment } from 'src/environments/environment';

/** Known S3 bucket hostnames — rewritten to media CDN when configured. */
const S3_HOST_PATTERNS = [
  /course-oilandgas\.s3[.-][a-z0-9-]+\.amazonaws\.com/i,
  /\.s3[.-][a-z0-9-]+\.amazonaws\.com/i,
  /s3\.amazonaws\.com/i,
];

/**
 * Optional CloudFront (or other CDN) origin for media uploaded to S3.
 * Set `mediaCdnUrl` in environment (e.g. https://d123.cloudfront.net).
 */
export function resolveMediaCdnUrl(raw: string | null | undefined): string {
  const s = (raw ?? '').toString().trim();
  if (!s) {
    return '';
  }

  const cdnBase = (environment as { mediaCdnUrl?: string }).mediaCdnUrl?.replace(/\/$/, '');
  if (!cdnBase || !/^https?:\/\//i.test(s)) {
    return s;
  }

  try {
    const url = new URL(s);
    if (S3_HOST_PATTERNS.some((re) => re.test(url.hostname))) {
      return `${cdnBase}${url.pathname}${url.search}`;
    }
  } catch {
    /* keep original */
  }

  return s;
}

/** Raster extensions eligible for optional WebP sibling URLs on CDN. */
const WEBP_ELIGIBLE = /\.(jpe?g|png)$/i;

/**
 * When `mediaCdnWebpSuffix` is set in environment (e.g. `.webp`), returns a WebP CDN URL
 * for JPEG/PNG S3 objects. Use with `<picture>` or as a progressive-enhancement srcset later.
 * Requires CloudFront/Lambda or bucket rules to serve the transformed object at that path.
 */
export function resolveWebpMediaUrl(raw: string | null | undefined): string {
  const cdnUrl = resolveMediaCdnUrl(raw);
  if (!cdnUrl) return '';

  const webpSuffix = (environment as { mediaCdnWebpSuffix?: string }).mediaCdnWebpSuffix;
  if (!webpSuffix || !WEBP_ELIGIBLE.test(cdnUrl)) {
    return '';
  }

  return cdnUrl.replace(WEBP_ELIGIBLE, webpSuffix);
}

/**
 * Primary display URL: CDN rewrite + optional WebP when configured and applicable.
 */
export function resolveOptimizedMediaUrl(raw: string | null | undefined): string {
  const webp = resolveWebpMediaUrl(raw);
  return webp || resolveMediaCdnUrl(raw);
}
