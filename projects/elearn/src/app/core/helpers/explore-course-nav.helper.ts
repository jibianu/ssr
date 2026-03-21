import { Router } from '@angular/router';
import { resolveCourseId, resolveCourseSlug } from './course-id.helper';

export type ExploreCourseNavEnv = {
  publicCourseSiteUrl?: string;
  exploreOpenMarketingSiteInSameTab?: boolean;
};

/**
 * From Explore / category list: open public marketing course page (slug URL on site) or Elearn route with optional publicSlug hint.
 */
export function navigateExploreCourseMarketingPage(
  router: Router,
  item: unknown,
  env: ExploreCourseNavEnv
): void {
  const id = resolveCourseId(item);
  if (!id) return;
  const slug = resolveCourseSlug(item);
  const base = (env.publicCourseSiteUrl || '').replace(/\/$/, '');
  if (env.exploreOpenMarketingSiteInSameTab && base && slug) {
    const path = slug
      .split('/')
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join('/');
    window.location.assign(`${base}/${path}`);
    return;
  }
  const extras = slug ? { queryParams: { publicSlug: slug } } : {};
  void router.navigate(['/app/student/categories/course', id], extras);
}
