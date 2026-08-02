/**
 * Single source of truth for category URL slugs.
 *
 * Canonical category URL format: /category/{lowercase-hyphenated-name}
 * e.g. "Structural design" → structural-design, "Process" → process.
 * The backend sitemap generator (SeoController) mirrors this normalization —
 * keep both in sync so sitemap URLs always match canonical tags.
 */

/** Lowercase, hyphen-separated slug from a category name or URL segment. */
export function normalizeCategorySlug(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  let s = String(value);
  try {
    s = decodeURIComponent(s);
  } catch {
    // keep original when a malformed escape sequence exists
  }
  return s
    .replace(/^\/+/, '')
    .replace(/category\//i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Human title from a slug or raw name: "piping-design" → "Piping Design". */
export function formatCategoryTitle(value: string | null | undefined): string {
  const slug = normalizeCategorySlug(value);
  if (!slug) {
    return '';
  }
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Router commands for a category link — always the canonical lowercase slug. */
export function categoryRouterLink(nameOrSlug: string | null | undefined): string[] {
  const slug = normalizeCategorySlug(nameOrSlug);
  return slug ? ['/category', slug] : ['/courses'];
}
