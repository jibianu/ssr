/**
 * Encodes HTTP(S) image URLs so paths with spaces / special characters load (e.g. S3 keys).
 * Relative paths (assets/...) are returned unchanged.
 */
export function sanitizeImageUrl(url: string | null | undefined): string {
  if (url == null || typeof url !== 'string') {
    return '';
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    const u = new URL(trimmed);
    u.pathname = u.pathname
      .split('/')
      .map((segment) => {
        if (segment === '') {
          return segment;
        }
        try {
          return encodeURIComponent(decodeURIComponent(segment));
        } catch {
          return encodeURIComponent(segment);
        }
      })
      .join('/');
    return u.toString();
  } catch {
    return trimmed.replace(/ /g, '%20');
  }
}
