import { CanMatchFn } from '@angular/router';

/** Marketing pages loaded lazily — must not intercept course/event/blog slugs. */
export const MARKETING_LAZY_PATHS = new Set([
  'contact-us',
  'about-us',
  'partner-us',
  'career',
  'in-house-solutions',
  'membership',
  'policies',
  'mission-and-vision',
  'affiliate-program',
  'guest-blogging',
  'become-our-trainer',
  'corporate-training',
  'courses-offered',
  'why-oilandgasclub',
  'build-your-portfolio',
  'terms-and-conditions',
  'refund-cancellation-policy',
  'privacy-policy',
]);

export const marketingPagesCanMatch: CanMatchFn = (_route, segments) => {
  const first = segments[0]?.path ?? '';
  return MARKETING_LAZY_PATHS.has(first);
};
