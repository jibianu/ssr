/**
 * Normalizes course id from API payloads (camelCase or PascalCase) for routing and HTTP calls.
 */
export function resolveCourseId(entity: unknown): string {
  if (entity == null || typeof entity !== 'object') {
    return '';
  }
  const o = entity as Record<string, unknown>;
  const v = o.id ?? o.Id ?? o.courseId ?? o.CourseId;
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

/** Public marketing path segment(s), e.g. api-570-closed-book-mock-exam (from list/detail API). */
export function resolveCourseSlug(entity: unknown): string {
  if (entity == null || typeof entity !== 'object') {
    return '';
  }
  const o = entity as Record<string, unknown>;
  const v = o.slug ?? o.Slug;
  if (v == null || String(v).trim() === '') return '';
  let s = String(v).trim();
  if (s.includes('..')) return '';
  // Trailing hyphens often come from bad slugify and break public routes.
  s = s.replace(/-+$/g, '').trim();
  return s;
}
