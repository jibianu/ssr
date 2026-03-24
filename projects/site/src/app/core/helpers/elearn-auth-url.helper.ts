import { environment } from 'src/environments/environment';

/**
 * Build URL to Elearn auth routes.
 * Same host (merged SSR): canonical **`/auth/...`** (Express serves Elearn at `/auth`; not `/course/auth/...`).
 * Full origin `elearnAppUrl` (e.g. `http://localhost:4201`): that origin + `/auth/...`.
 */
export function buildElearnAuthUrl(
  authPath: string,
  queryWithoutQuestionMark = '',
  envBaseOverride?: string
): string {
  const envBase = (envBaseOverride ?? (environment as { elearnAppUrl?: string }).elearnAppUrl ?? '').trim();
  const path = authPath.replace(/^\//, '').replace(/^auth\//, '');
  const query =
    queryWithoutQuestionMark.length > 0
      ? queryWithoutQuestionMark.startsWith('?')
        ? queryWithoutQuestionMark
        : `?${queryWithoutQuestionMark}`
      : '';
  if (envBase.startsWith('http://') || envBase.startsWith('https://')) {
    return `${envBase.replace(/\/$/, '')}/${path}${query}`;
  }
  return `/${path}${query}`;
}
