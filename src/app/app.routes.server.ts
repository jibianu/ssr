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
  { path: 'courses', renderMode: RenderMode.Server }, // Public course home (category filtering)
  { path: 'events', renderMode: RenderMode.Server }, // Dynamic event listing
  // Note: Dynamic routes (category/:name, course detail routes /:url and /:url/:location, events/:url) 
  // are handled by the wildcard fallback below since they have parameters

  // Wildcard fallback
  { path: '**', renderMode: RenderMode.Server }
];
