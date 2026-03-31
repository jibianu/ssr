import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Root / public layout
  { path: '', renderMode: RenderMode.Server },

  // ✅ CACHING: Static content pages - prerender for instant loads
  { path: 'about-us', renderMode: RenderMode.Server },
  { path: 'contact-us', renderMode: RenderMode.Server },
  { path: 'mission-and-vision', renderMode: RenderMode.Server },
  { path: 'terms-and-conditions', renderMode: RenderMode.Server },
  { path: 'privacy-policy', renderMode: RenderMode.Server },
  { path: 'refund-cancellation-policy', renderMode: RenderMode.Server },
  { path: 'why-oilandgasclub', renderMode: RenderMode.Server },
  { path: 'build-your-portfolio', renderMode: RenderMode.Server },
  { path: 'courses-offered', renderMode: RenderMode.Server },
  { path: 'corporate-training', renderMode: RenderMode.Server },
  { path: 'guest-blogging', renderMode: RenderMode.Server },
  { path: 'become-our-trainer', renderMode: RenderMode.Server },
  { path: 'partner-us', renderMode: RenderMode.Server },
  { path: 'career', renderMode: RenderMode.Server },
  { path: 'membership', renderMode: RenderMode.Server },
  { path: 'affiliate-program', renderMode: RenderMode.Server },
  // { path: 'worlds-largest-refineries', renderMode: RenderMode.Server },
  { path: 'in-house-solutions', renderMode: RenderMode.Server },
  { path: 'policies', renderMode: RenderMode.Server },

  // Page not found
  { path: 'page-not-found', renderMode: RenderMode.Server },

  // Dynamic routes - must be server-rendered
  { path: 'auth', renderMode: RenderMode.Server },
  { path: 'app', renderMode: RenderMode.Server },
  { path: 'courses', renderMode: RenderMode.Server }, // Public course home (category filtering)
  { path: 'blog', renderMode: RenderMode.Server }, // Blog list + lazy routes
  { path: 'events', renderMode: RenderMode.Server }, // Event listing + lazy child routes
  // Note: Dynamic routes (category/:name, course detail routes /:url and /:url/:location, events/:url) 
  // are handled by the wildcard fallback below since they have parameters

  // Wildcard fallback
  { path: '**', renderMode: RenderMode.Server }
];


