/** Single-segment paths that belong to the Elearn app shell, not public slug pages. */
export const APP_SHELL_SLUG_SEGMENTS = new Set([
  'app',
  'dashboard',
  'company',
  'admin',
  'trainer',
  'student',
  'management',
  'affiliate',
]);

/** Browser path for a reserved shell segment (unified tenant URLs without `/app` prefix). */
export function appShellRedirectForSlug(slug: string): string | null {
  switch ((slug || '').trim().toLowerCase()) {
    case 'dashboard':
    case 'app':
      return '/app';
    case 'company':
      return '/company/dashboard';
    case 'admin':
      return '/admin/students';
    case 'student':
      return '/student/dashboard';
    case 'trainer':
      return '/trainer/course/list';
    case 'management':
      return '/management/dashboard';
    case 'affiliate':
      return '/affiliate/dashboard';
    default:
      return null;
  }
}

export function isAppShellSlug(slug: string): boolean {
  return APP_SHELL_SLUG_SEGMENTS.has((slug || '').trim().toLowerCase());
}
