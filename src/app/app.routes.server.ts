import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Root / public layout
  { path: '', renderMode: RenderMode.Prerender },

  // Lazy-loaded modules (no child paths here)
  { path: 'auth', renderMode: RenderMode.Server },
  { path: 'app', renderMode: RenderMode.Server },

  // Page not found
  { path: 'page-not-found', renderMode: RenderMode.Prerender },

  // Wildcard fallback
  { path: '**', renderMode: RenderMode.Server }
];
