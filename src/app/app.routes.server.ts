import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Root / public layout
  { path: '', renderMode: RenderMode.Prerender },

  // ✅ CACHING: Static content pages - prerender for instant loads
  { path: 'about-us', renderMode: RenderMode.Prerender },
  { path: 'contact-us', renderMode: RenderMode.Prerender },
  { path: 'mission-and-vision', renderMode: RenderMode.Prerender },
  { path: 'terms-and-conditions', renderMode: RenderMode.Prerender },
  { path: 'privacy-policy', renderMode: RenderMode.Prerender },
  { path: 'refund-cancellation-policy', renderMode: RenderMode.Prerender },
  { path: 'why-oilandgasclub', renderMode: RenderMode.Prerender },
  { path: 'build-your-portfolio', renderMode: RenderMode.Prerender },
  { path: 'courses-offered', renderMode: RenderMode.Prerender },
  { path: 'corporate-training', renderMode: RenderMode.Prerender },
  { path: 'guest-blogging', renderMode: RenderMode.Prerender },
  { path: 'become-our-trainer', renderMode: RenderMode.Prerender },
  { path: 'partner-us', renderMode: RenderMode.Prerender },
  { path: 'career', renderMode: RenderMode.Prerender },
  { path: 'membership', renderMode: RenderMode.Prerender },
  { path: 'affiliate-program', renderMode: RenderMode.Prerender },
  { path: 'worlds-largest-refineries', renderMode: RenderMode.Prerender },
  { path: 'in-house-solutions', renderMode: RenderMode.Prerender },
  { path: 'policies', renderMode: RenderMode.Prerender },

  // Page not found
  { path: 'page-not-found', renderMode: RenderMode.Prerender },

  // Dynamic routes - must be server-rendered
  { path: 'auth', renderMode: RenderMode.Server },
  { path: 'app', renderMode: RenderMode.Server },
  { path: 'course', renderMode: RenderMode.Server }, // Public course home (category filtering)
  // Note: course/:url and course/:url/:location are lazy-loaded child routes
  // They will be handled by the wildcard fallback below
  { path: 'events', renderMode: RenderMode.Server }, // Dynamic event listing
  // Note: events/:url is a lazy-loaded child route, handled by wildcard

  // Wildcard fallback
  { path: '**', renderMode: RenderMode.Server }
];
